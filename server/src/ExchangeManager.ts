import ccxt, { Exchange } from "ccxt";
import { logger } from "./utils/Logger";
import { Cache } from "./utils/Cache";

interface ExchangeConfig {
  apiKey?: string;
  secret?: string;
  password?: string;
  enableRateLimit?: boolean;
  timeout?: number;
}

export class ExchangeManager {
  private exchanges: Map<string, Exchange> = new Map();
  private requestCounts: Map<string, number> = new Map();

  constructor(exchangeConfigs: Record<string, ExchangeConfig>) {
    logger.info(
      `Initializing ExchangeManager with exchanges: ${Object.keys(exchangeConfigs).join(", ")}`,
    );

    Object.entries(exchangeConfigs).forEach(([id, config]) => {
      if (ccxt.exchanges.includes(id)) {
        const exchangeOptions: ExchangeConfig = {
          enableRateLimit: true,
          timeout: 30000,
          ...config,
        };

        const ExchangeClass = (ccxt as any)[id];
        const exchange = new ExchangeClass(exchangeOptions);

        if (id === "bybit") {
          exchange.options["defaultType"] = "spot";
        }

        this.wrapExchangeMethods(exchange, id);

        this.exchanges.set(id, exchange);
        logger.debug(`Exchange ${id} initialized successfully`);
      } else {
        logger.warn(`Exchange ${id} is not supported by CCXT.`);
      }
    });
  }

  private async handleRateLimit(exchangeId: string): Promise<void> {
    logger.warn(
      `Rate limit hit for ${exchangeId}, waiting 15 seconds before retrying...`,
    );
    await new Promise((resolve) => setTimeout(resolve, 15000));
    logger.info(`Resuming operations for ${exchangeId}`);
  }

  private async executeWithRateLimitHandling(
    exchangeId: string,
    operation: () => Promise<any>,
  ): Promise<any> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof ccxt.RateLimitExceeded) {
        logger.warn(
          `Rate limit exceeded on exchange ${exchangeId}. Retrying after delay...`,
        );
        await this.handleRateLimit(exchangeId);
        // Retry the operation once after waiting
        return await operation();
      }
      throw error;
    }
  }

  private wrapExchangeMethods(exchange: Exchange, exchangeId: string): void {
    const methodsToWrap = [
      "fetchTicker",
      "fetchTickers",
      "loadMarkets",
      "fetchOrderBook",
      "fetchTrades",
      "fetchCurrencies",
    ];

    methodsToWrap.forEach((method) => {
      if (typeof (exchange as any)[method] === "function") {
        const originalMethod = (exchange as any)[method].bind(exchange);
        (exchange as any)[method] = async (...args: any[]) => {
          this.incrementRequestCount(exchangeId);
          return this.executeWithRateLimitHandling(exchangeId, () =>
            originalMethod(...args),
          );
        };
      }
    });
  }

  private incrementRequestCount(exchangeId: string): void {
    const currentCount = this.requestCounts.get(exchangeId) || 0;
    this.requestCounts.set(exchangeId, currentCount + 1);
  }

  getExchange(id: string): Exchange | undefined {
    const exchange = this.exchanges.get(id);
    if (!exchange) {
      logger.warn(`Attempted to get non-existent exchange: ${id}`);
    }
    return exchange;
  }

  getAllExchanges(): Exchange[] {
    return Array.from(this.exchanges.values());
  }

  getRequestCounts(): Map<string, number> {
    return new Map(this.requestCounts);
  }

  resetRequestCounts(): void {
    this.requestCounts = new Map();
  }
  normalizeNetwork(network: string): string {
    const specificMappings: { [key: string]: string } = {
      BEP20: "BSC",
      BEP2: "BSC",
      "BNB Smart Chain (BEP20)": "BSC",
      "BNB Beacon Chain (BEP2)": "BSC",
      "Bitcoin(SegWit)": "BTC-SegWit",
      "Bitcoin(BTC)": "BTC",
      "Solana(SOL)": "Solana",
      HBTC: "HBTC",
      HECO: "HECO",
      HRC20: "HRC20",
      TRC20: "TRC20",
      LIGHTNING: "Lightning",
      ERC20: "ETH",
      "Ethereum (ERC20)": "ETH",
      "Dogecoin(DOGE)": "DOGE",
      DOGE: "DOGE",
      // Add more mappings as needed
    };

    if (network.includes("(")) {
      network = network.split("(")[1].split(")")[0];
    }

    if (specificMappings[network]) {
      return specificMappings[network].toUpperCase();
    }

    return network.toUpperCase();
  }

  public async findAvailableNetworksWithFees(
    buyExchangeId: string,
    sellExchangeId: string,
    currencyCode: string,
  ): Promise<
    | {
        network: string | null;
        withdrawalFee: number | null;
        depositEnabled: boolean | null;
      }[]
    | null
  > {
    const cacheKey = `${buyExchangeId}:${sellExchangeId}:${currencyCode}`;
    const cachedResult = Cache.getAvailableNetworksWithFees(cacheKey);

    if (cachedResult !== undefined) {
      logger.info(`Cache hit for key: ${cacheKey}`);
      return cachedResult ? cachedResult : null;
    }

    logger.info(`Cache miss for key: ${cacheKey}. Fetching data...`);

    try {
      const fromExchange = this.getExchange(buyExchangeId);
      const toExchange = this.getExchange(sellExchangeId);
      if (!fromExchange || !toExchange) {
        throw new Error(
          `Exchange '${buyExchangeId}' or '${sellExchangeId}' not found or failed to initialize.`,
        );
      }

      // Fetch withdrawal fee data from both exchanges
      const [fromMarketData, toMarketData] = await Promise.all([
        fromExchange.fetchDepositWithdrawFee(currencyCode),
        toExchange.fetchDepositWithdrawFee(currencyCode),
      ]);

      const getNetworksData = (exchangeId: string, marketData: any): any => {
        switch (exchangeId) {
          case "binance":
          case "mexc":
          case "bingx":
            return marketData.info.networkList?.reduce(
              (acc: any, network: any) => {
                acc[network.network] = network;
                return acc;
              },
              {},
            );
          case "okx":
            return marketData.info[currencyCode]
              ? {
                  [marketData.info[currencyCode].chain]:
                    marketData.info[currencyCode],
                }
              : {};
          case "gateio":
            return marketData.info.withdraw_fix_on_chains;
          case "bitget":
            return marketData.info.chains?.reduce((acc: any, chain: any) => {
              acc[chain.chain] = chain;
              return acc;
            }, {});
          case "bitmex":
            return marketData.info.networks?.reduce(
              (acc: any, network: any) => {
                acc[network.asset.toUpperCase()] = network;
                return acc;
              },
              {},
            );
          case "poloniex": {
            const poloniexData = marketData.info[currencyCode];
            if (poloniexData) {
              const networks = [
                poloniexData.blockchain,
                ...(poloniexData.childChains || []),
              ];
              return networks.reduce((acc: any, network: any) => {
                acc[network] = poloniexData;
                return acc;
              }, {});
            }
            return {};
          }
          case "huobi":
            return marketData.info.chains?.reduce((acc: any, chain: any) => {
              acc[chain.chain.toUpperCase()] = chain;
              return acc;
            }, {});
          case "kucoin":
            return marketData.info.chain
              ? { [marketData.info.chain.toUpperCase()]: marketData.info }
              : {};
          case "bybit":
            return marketData.info.chains?.reduce((acc: any, chain: any) => {
              acc[chain.chain] = chain;
              return acc;
            }, {});
          default:
            return marketData.networks;
        }
      };

      const fromNetworksData = getNetworksData(buyExchangeId, fromMarketData);
      const toNetworksData = getNetworksData(sellExchangeId, toMarketData);

      if (!fromNetworksData && !toNetworksData) {
        console.warn(
          `Currency '${currencyCode}' not found in both '${buyExchangeId}' and '${sellExchangeId}' exchanges.`,
        );
        Cache.setAvailableNetworksWithFees(cacheKey, undefined);
        return null;
      }

      const buyNetworks = fromNetworksData
        ? Object.keys(fromNetworksData).map(this.normalizeNetwork)
        : [];
      const sellNetworks = toNetworksData
        ? Object.keys(toNetworksData).map(this.normalizeNetwork)
        : [];

      const allNetworksSet = new Set<string>([...buyNetworks, ...sellNetworks]);
      const allNetworks = Array.from(allNetworksSet);

      if (allNetworks.length === 0) {
        console.warn(
          `No networks found for currency '${currencyCode}' in either '${buyExchangeId}' or '${sellExchangeId}' exchanges.`,
        );
        Cache.setAvailableNetworksWithFees(cacheKey, undefined);
        return null;
      }

      const generalWithdrawalFee = fromMarketData.withdraw?.fee
        ? typeof fromMarketData.withdraw.fee === "number"
          ? fromMarketData.withdraw.fee
          : parseFloat(fromMarketData.withdraw.fee)
        : null;

      const getDepositStatus = (
        exchangeId: string,
        marketData: any,
        originalNetworkKey: string,
      ): boolean | null => {
        switch (exchangeId) {
          case "binance":
          case "mexc":
          case "bingx": {
            const network = marketData[originalNetworkKey];
            return network ? network.depositEnable : null;
          }
          case "okx": {
            const info = marketData[originalNetworkKey];
            return info ? info.canDep : null;
          }
          case "gateio": {
            // GateIO doesn't provide network-specific deposit status in the data structure
            return marketData.deposit === "0" ? true : null;
          }
          case "bitget": {
            const chain = marketData[originalNetworkKey];
            return chain ? chain.rechargeable === "true" : null;
          }
          case "bitmex": {
            const network = marketData[originalNetworkKey];
            return network ? network.depositEnabled : null;
          }
          case "poloniex": {
            const networkData = marketData[originalNetworkKey];
            return networkData
              ? networkData.walletDepositState === "ENABLED"
              : null;
          }
          case "huobi": {
            const chain = marketData[originalNetworkKey];
            return chain ? chain.depositStatus === "allowed" : null;
          }
          case "bybit": {
            const chain = marketData[originalNetworkKey];
            return chain ? chain.chainDeposit === "1" : null;
          }
          case "kucoin": {
            // KuCoin doesn't provide deposit status in the data structure
            return null;
          }
          default:
            return null;
        }
      };

      const availableNetworksWithFees = allNetworks.map((network) => {
        const normalizedNetwork = this.normalizeNetwork(network);

        // Find original network key for buy exchange (for withdrawal fees)
        const originalBuyNetworkKey = Object.keys(fromNetworksData || {}).find(
          (key) => this.normalizeNetwork(key) === normalizedNetwork,
        );

        let withdrawalFee: number | null = null;

        if (originalBuyNetworkKey) {
          const networkData = fromNetworksData![originalBuyNetworkKey];

          switch (buyExchangeId) {
            case "binance":
            case "mexc":
            case "bingx":
            case "bitget":
            case "huobi":
              withdrawalFee = parseFloat(
                networkData.withdrawFee ||
                  networkData.transactFeeWithdraw ||
                  networkData.withdraw_fix ||
                  networkData.withdrawalFee ||
                  networkData.withdrawFixOnChains?.[originalBuyNetworkKey] ||
                  "0",
              );
              break;
            case "okx":
              withdrawalFee = parseFloat(networkData.minFee);
              break;
            case "gateio":
              withdrawalFee = parseFloat(networkData);
              break;
            case "bitmex":
              withdrawalFee = parseFloat(networkData.withdrawalFee);
              break;
            case "poloniex":
              withdrawalFee = parseFloat(networkData.withdrawalFee);
              break;
            case "kucoin":
              withdrawalFee = parseFloat(networkData.withdrawMinFee);
              break;
            case "bybit":
              withdrawalFee = parseFloat(networkData.withdrawFee || "0");
              break;
            default:
              if (networkData.withdraw && networkData.withdraw.fee) {
                withdrawalFee = parseFloat(networkData.withdraw.fee);
              } else {
                withdrawalFee = generalWithdrawalFee;
              }
              break;
          }
        } else if (generalWithdrawalFee !== null) {
          withdrawalFee = generalWithdrawalFee;
        }

        // Find original network key for sell exchange (for deposit status)
        const originalSellNetworkKey = Object.keys(toNetworksData || {}).find(
          (key) => this.normalizeNetwork(key) === normalizedNetwork,
        );

        const depositEnabled = originalSellNetworkKey
          ? getDepositStatus(
              sellExchangeId,
              toNetworksData,
              originalSellNetworkKey,
            )
          : null;

        return {
          network: normalizedNetwork || null,
          withdrawalFee: withdrawalFee !== null ? withdrawalFee : null,
          depositEnabled: depositEnabled !== null ? depositEnabled : null,
        };
      });

      Cache.setAvailableNetworksWithFees(cacheKey, availableNetworksWithFees);

      return availableNetworksWithFees;
    } catch (error) {
      logger.error("Error in findAvailableNetworksWithFees:", error);
      return null;
    }
  }
}
