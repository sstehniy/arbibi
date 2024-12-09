// --- src/ArbitrageBot.ts ---
import { EventEmitter } from "events";
import { ExchangeManager } from "./ExchangeManager";
import {
  Opportunity,
  PriceData,
  CrossExchangeOpportunity,
  TriangleOpportunity,
} from "./types";
import { logger } from "./utils/Logger";
import { Cache, CacheData } from "./utils/Cache";
import { Ticker, Market } from "ccxt";
import { db } from "./db";
import { opportunitiesTable } from "./db/schema";
import { lt, sql, eq, and } from "drizzle-orm";

const quotes = ["USDT", "TRY", "BUSD", "USDC", "BTC"];

export class ArbitrageBot extends EventEmitter {
  public exchangeManager: ExchangeManager;
  private tradingPairs: Map<string, string[]> = new Map();
  private quoteCurrencies: Map<string, Set<string>> = new Map();
  private lastMarketDataRefresh: number = 0;
  private cycleCount: number = 0;
  private exchangeTickers: Map<string, Record<string, Ticker>> = new Map();
  private readonly DB_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly OPPORTUNITY_EXPIRY = 30 * 60 * 1000; // 30 minutes
  private readonly CACHE_CLEANUP_INTERVAL = 30000; // 30 seconds

  constructor(
    exchangeConfigs: Record<
      string,
      { apiKey?: string; secret?: string; password?: string }
    >,
    private readonly minProfitThreshold: number,
    private readonly maxProfitThreshold: number,
    private readonly maxPairs: number,
  ) {
    super();
    logger.info(
      `Initializing ArbitrageBot with ${Object.keys(exchangeConfigs).length} exchanges`,
    );
    logger.info(
      `Configuration: minProfitThreshold=${minProfitThreshold}, maxProfitThreshold=${maxProfitThreshold}, maxPairs=${maxPairs}`,
    );

    this.exchangeManager = new ExchangeManager(exchangeConfigs);
    this.loadCachedData();

    setInterval(() => {
      const stats = Cache.getCacheStats();
      logger.debug(
        `Cache stats - Hit Rate: ${stats.hitRate.toFixed(2)}%, Hits: ${stats.hits}, Misses: ${stats.misses}`,
      );
      Cache.resetStats();
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  private loadCachedData(): void {
    const cachedData = Cache.loadMarketData();
    if (cachedData) {
      this.tradingPairs = cachedData.tradingPairs;
      this.quoteCurrencies = cachedData.quoteCurrencies;
      this.lastMarketDataRefresh = cachedData.timestamp;
      logger.info("Loaded market data from in-memory cache");
    }
  }

  private saveCacheData(): void {
    const data: CacheData = {
      tradingPairs: this.tradingPairs,
      priceCache: Cache.priceCache,
      quoteCurrencies: this.quoteCurrencies,
      timestamp: Date.now(),
    };
    Cache.saveMarketData(data);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldRefreshMarketData(): boolean {
    return (
      Date.now() - this.lastMarketDataRefresh >= 5 * 60 * 1000 // 5 minutes
    );
  }

  private async fetchTradingPairs(): Promise<void> {
    try {
      if (!this.shouldRefreshMarketData() && this.tradingPairs.size > 0) {
        logger.info("Using cached trading pairs data from in-memory cache");
        return;
      }

      logger.info("Fetching trading pairs from all exchanges...");
      const exchanges = this.exchangeManager.getAllExchanges();

      await Promise.all(
        exchanges.map(async (exchange) => {
          const exchangeId = exchange.id;
          logger.debug(`Loading markets for ${exchangeId}`);
          await exchange.loadMarkets();
          const tickers = await exchange.fetchTickers();
          logger.debug(
            `Fetched ${Object.keys(tickers).length} tickers from ${exchangeId}`,
          );

          this.exchangeTickers.set(exchangeId, tickers);

          const validPairs = Object.entries(tickers)
            .filter(([symbol, ticker]) =>
              this.isValidPair(symbol, ticker, exchange),
            )
            .map(([symbol]) => symbol)
            .sort((a, b) => {
              const volumeA = tickers[a].quoteVolume || 0;
              const volumeB = tickers[b].quoteVolume || 0;
              return volumeB - volumeA;
            })
            .slice(0, this.maxPairs);

          this.tradingPairs.set(exchangeId, validPairs);
          this.analyzeQuoteCurrencies(exchangeId, validPairs);
        }),
      );

      this.lastMarketDataRefresh = Date.now();
      this.saveCacheData();
    } catch (error) {
      logger.error("Error fetching trading pairs", error);
    }
  }

  private isValidPair(symbol: string, ticker: Ticker, exchange: any): boolean {
    try {
      let marketSymbol = symbol;
      if (exchange.id === "bybit" && symbol.includes(":")) {
        marketSymbol = symbol.split(":")[0];
      }

      const market: Market = exchange.markets[marketSymbol];
      if (!market || market.type !== "spot") {
        return false;
      }

      const [, originalQuote] = marketSymbol.split("/");
      if (!originalQuote) {
        logger.debug(`Invalid symbol format: ${symbol}`);
        return false;
      }

      let quote = originalQuote;
      if (exchange.id === "bybit" && quote.includes(":")) {
        quote = quote.split(":")[0];
      }

      const quoteVolume = ticker.quoteVolume ?? 0;
      return quotes.includes(quote) && quoteVolume > 0;
    } catch (error) {
      logger.error(`Error processing symbol ${symbol}:`, error);
      return false;
    }
  }

  private analyzeQuoteCurrencies(exchangeId: string, pairs: string[]): void {
    logger.debug(`Analyzing quote currencies for ${exchangeId}`);
    const quoteCounts = new Map<string, number>();

    pairs.forEach((pair) => {
      const [, quote] = pair.split("/");
      if (quote) {
        quoteCounts.set(quote, (quoteCounts.get(quote) || 0) + 1);
      }
    });

    const minPairs = pairs.length * 0.05;
    const significantQuotes = Array.from(quoteCounts.entries())
      .filter(([, count]) => count >= minPairs)
      .map(([quote]) => quote);

    if (!this.quoteCurrencies.has(exchangeId)) {
      this.quoteCurrencies.set(exchangeId, new Set());
    }

    const quotesSet = this.quoteCurrencies.get(exchangeId)!;
    significantQuotes.forEach((quote) => quotesSet.add(quote));

    quotes.forEach((quote) => quotesSet.add(quote));

    logger.debug(
      `Found ${quotesSet.size} significant quote currencies for ${exchangeId}`,
    );
  }

  private async getTickerPrice(
    exchangeId: string,
    symbol: string,
  ): Promise<PriceData | null> {
    const cachedPriceEntry = Cache.getCachedPrice(exchangeId, symbol);
    if (cachedPriceEntry) {
      return cachedPriceEntry;
    }

    const tickers = this.exchangeTickers.get(exchangeId);
    if (!tickers) {
      logger.error(`No tickers found for exchange ${exchangeId}`);
      return null;
    }

    const ticker = tickers[symbol];

    if (!ticker) {
      logger.debug(`No ticker found for symbol ${symbol} on ${exchangeId}`);
      return null;
    }

    if (!ticker.bid || !ticker.ask) {
      logger.debug(
        `Invalid bid/ask for ${symbol} on ${exchangeId}: bid=${ticker.bid}, ask=${ticker.ask}`,
      );
      return null;
    }

    const priceData: PriceData = {
      bid: ticker.bid,
      ask: ticker.ask,
      volume: ticker.quoteVolume || 0,
      timestamp: Date.now(),
    };

    Cache.batchUpdatePrices([
      {
        exchangeId,
        symbol,
        data: priceData,
      },
    ]);

    return priceData;
  }

  private normalizeSymbol(symbol: string): string {
    return symbol.split(":")[0];
  }

  private async findCrossExchangeOpportunities(): Promise<
    CrossExchangeOpportunity[]
  > {
    logger.debug("Searching for cross-exchange opportunities");
    const opportunities: CrossExchangeOpportunity[] = [];
    const exchanges = this.exchangeManager.getAllExchanges();

    const symbolMap: Map<
      string,
      { exchangeId: string; priceData: PriceData; originalSymbol: string }[]
    > = new Map();

    for (const exchange of exchanges) {
      const exchangeId = exchange.id;
      const pairs = this.tradingPairs.get(exchangeId) || [];

      for (const symbol of pairs) {
        const price = await this.getTickerPrice(exchangeId, symbol);
        if (!price) continue;

        const normalizedSymbol = this.normalizeSymbol(symbol);
        if (!symbolMap.has(normalizedSymbol)) {
          symbolMap.set(normalizedSymbol, []);
        }

        symbolMap.get(normalizedSymbol)!.push({
          exchangeId,
          priceData: price,
          originalSymbol: symbol,
        });
      }
    }

    for (const [normalizedSymbol, priceInfos] of symbolMap.entries()) {
      for (let i = 0; i < priceInfos.length; i++) {
        for (let j = 0; j < priceInfos.length; j++) {
          if (i === j) continue;

          const buyExchange = priceInfos[i];
          const sellExchange = priceInfos[j];

          const buyPrice = buyExchange.priceData.ask;
          const sellPrice = sellExchange.priceData.bid;

          const profit = sellPrice / buyPrice - 1;

          if (
            profit > this.minProfitThreshold &&
            profit < this.maxProfitThreshold
          ) {
            const opportunity: CrossExchangeOpportunity = {
              type: "Cross-Exchange",
              path: [
                `${this.normalizeSymbol(buyExchange.originalSymbol)} on ${buyExchange.exchangeId}`,
                `${this.normalizeSymbol(sellExchange.originalSymbol)} on ${sellExchange.exchangeId}`,
              ],
              profitPercentage: profit * 100,
              minVolume: Math.min(
                buyExchange.priceData.volume,
                sellExchange.priceData.volume,
              ),
              timestamp: new Date().toISOString(),
              buyPrice,
              sellPrice,
              buyExchange: buyExchange.exchangeId,
              sellExchange: sellExchange.exchangeId,
              symbol: normalizedSymbol,
            };
            logger.info(
              `Found cross-exchange opportunity with ${opportunity.profitPercentage.toFixed(
                2,
              )}% profit`,
            );
            opportunities.push(opportunity);
          }
        }
      }
    }

    logger.info(`Found ${opportunities.length} cross-exchange opportunities`);
    return opportunities.sort((a, b) => b.minVolume - a.minVolume);
  }

  private async findOpportunities(): Promise<Opportunity[]> {
    this.cycleCount++;
    const timestamp = new Date().toISOString();
    logger.info(
      `\n=== Starting opportunity search cycle #${this.cycleCount} at ${timestamp} ===`,
    );

    if (this.shouldRefreshMarketData()) {
      logger.info("Market data refresh needed, fetching new data...");
      await this.fetchTradingPairs();
    } else {
      const nextRefreshIn = Math.round(
        (5 * 60 * 1000 - (Date.now() - this.lastMarketDataRefresh)) / 60000,
      );
      logger.info(
        `Using existing market data (next refresh in ${nextRefreshIn} minutes)`,
      );
    }

    logger.info("Fetching latest tickers...");
    const exchanges = this.exchangeManager.getAllExchanges();
    await Promise.all(
      exchanges.map(async (exchange) => {
        try {
          const exchangeId = exchange.id;
          const tickers = await exchange.fetchTickers();
          this.exchangeTickers.set(exchangeId, tickers);
        } catch (error) {
          logger.error(`Error fetching tickers for ${exchange.id}:`, error);
        }
      }),
    );

    logger.info("Searching for opportunities...");
    const crossExchangeOpportunities =
      await this.findCrossExchangeOpportunities();

    const triangleOpportunities: TriangleOpportunity[] = [];

    const allOpportunities: Opportunity[] = [
      ...crossExchangeOpportunities,
      ...triangleOpportunities,
    ].sort((a, b) => b.profitPercentage - a.profitPercentage);

    logger.info(
      `\n=== Completed cycle #${this.cycleCount}: Found ${allOpportunities.length} total opportunities ===\n`,
    );

    this.logRequestCounts();
    this.logCacheStats();

    return allOpportunities;
  }

  private logRequestCounts(): void {
    const requestCounts = this.exchangeManager.getRequestCounts();
    logger.info("API Request Counts per Exchange:");
    for (const [exchangeId, count] of requestCounts.entries()) {
      logger.info(`- ${exchangeId}: ${count} requests`);
    }
    this.exchangeManager.resetRequestCounts();
  }

  private logCacheStats(): void {
    const stats = Cache.getCacheStats();
    logger.info("Cache Performance:");
    logger.info(`- Hit Rate: ${stats.hitRate.toFixed(2)}%`);
    logger.info(`- Hits: ${stats.hits}`);
    logger.info(`- Misses: ${stats.misses}`);
    logger.info(`- Total Requests: ${stats.totalRequests}`);
  }

  private async cleanupExpiredOpportunities(): Promise<void> {
    try {
      const expiryTime = new Date(Date.now() - this.OPPORTUNITY_EXPIRY);
      logger.info(
        `Starting cleanup of opportunities older than ${expiryTime.toISOString()}`,
      );

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(opportunitiesTable)
        .where(lt(opportunitiesTable.timestamp, expiryTime));

      const count = countResult[0].count;

      if (count > 0) {
        await db
          .delete(opportunitiesTable)
          .where(lt(opportunitiesTable.timestamp, expiryTime));

        logger.info(`Cleaned up ${count} expired opportunities`);
      } else {
        logger.debug("No expired opportunities to clean up");
      }
    } catch (error) {
      logger.error("Error cleaning up expired opportunities:", error);
      throw error;
    }
  }

  private async checkActiveOpportunities(): Promise<void> {
    try {
      const activeOpportunities = await db.select().from(opportunitiesTable);

      const activeExchanges = new Set<string>();
      activeOpportunities.forEach((op) => {
        activeExchanges.add(op.buyExchange);
        activeExchanges.add(op.sellExchange);
      });

      await Promise.all(
        Array.from(activeExchanges).map(async (exchangeId) => {
          try {
            const exchange = this.exchangeManager.getExchange(exchangeId);
            if (exchange) {
              const tickers = await exchange.fetchTickers();
              this.exchangeTickers.set(exchangeId, tickers);
            }
          } catch (error) {
            logger.error(`Error fetching tickers for ${exchangeId}:`, error);
          }
        }),
      );

      for (const op of activeOpportunities) {
        const buyPriceData = await this.getTickerPrice(
          op.buyExchange,
          op.symbol,
        );
        const sellPriceData = await this.getTickerPrice(
          op.sellExchange,
          op.symbol,
        );

        if (!buyPriceData || !sellPriceData) {
          await db
            .delete(opportunitiesTable)
            .where(
              and(
                eq(opportunitiesTable.buyExchange, op.buyExchange),
                eq(opportunitiesTable.sellExchange, op.sellExchange),
                eq(opportunitiesTable.symbol, op.symbol),
              ),
            );
          continue;
        }

        const buyPrice = Number(buyPriceData.ask);
        const sellPrice = Number(sellPriceData.bid);
        const profit = sellPrice / buyPrice - 1 - 2 * 0.001; // Assuming fee = 0.1%

        if (profit > this.minProfitThreshold) {
          await db
            .update(opportunitiesTable)
            .set({
              profitPercentage: (profit * 100).toString(),
              buyPrice: buyPrice.toFixed(20),
              sellPrice: sellPrice.toFixed(20),
              volume: Math.min(
                buyPriceData.volume,
                sellPriceData.volume,
              ).toString(),
              timestamp: new Date(),
            })
            .where(
              and(
                eq(opportunitiesTable.buyExchange, op.buyExchange),
                eq(opportunitiesTable.sellExchange, op.sellExchange),
                eq(opportunitiesTable.symbol, op.symbol),
              ),
            );
          logger.info(
            `Updated opportunity: ${op.symbol} on ${op.buyExchange} -> ${op.sellExchange}`,
          );
        } else {
          await db
            .delete(opportunitiesTable)
            .where(
              and(
                eq(opportunitiesTable.buyExchange, op.buyExchange),
                eq(opportunitiesTable.sellExchange, op.sellExchange),
                eq(opportunitiesTable.symbol, op.symbol),
              ),
            );
          logger.info(
            `Removed opportunity: ${op.symbol} on ${op.buyExchange} -> ${op.sellExchange}`,
          );
        }
      }
    } catch (error) {
      logger.error("Error checking active opportunities:", error);
    }
  }

  private async startActiveOpportunitiesCheckLoop(): Promise<void> {
    const checkInterval = 5000; // 5 seconds

    const loop = async () => {
      while (true) {
        try {
          await this.checkActiveOpportunities();
        } catch (error) {
          logger.error("Error in checkActiveOpportunities loop:", error);
        }
        await this.delay(checkInterval);
      }
    };

    // Start the loop without blocking the main thread
    loop().catch((error) => {
      logger.error(
        "Active opportunities check loop encountered an error:",
        error,
      );
    });
  }

  private async fetchLatestTickers(
    exchangeId: string,
    symbols: string[],
  ): Promise<void> {
    try {
      const exchange = this.exchangeManager.getExchange(exchangeId);
      if (!exchange) {
        logger.warn(`Exchange not found: ${exchangeId}`);
        return;
      }

      let tickers: Record<string, Ticker>;
      try {
        tickers = await exchange.fetchTickers(symbols);
        logger.debug(
          `Fetched tickers for ${exchangeId}: ${Object.keys(tickers).length}`,
        );
        this.exchangeTickers.set(exchangeId, tickers);
      } catch (fetchError) {
        logger.error(`Failed to fetch tickers for ${exchangeId}:`, fetchError);
        return;
      }

      const updates: {
        exchangeId: string;
        symbol: string;
        data: PriceData;
      }[] = [];

      for (const symbol of symbols) {
        const ticker = tickers[symbol];

        if (ticker === undefined) {
          logger.error(
            `Ticker for symbol "${symbol}" not found on exchange "${exchangeId}".`,
          );
          continue;
        }

        if (typeof ticker !== "object" || ticker === null) {
          logger.error(
            `Malformed ticker for symbol "${symbol}" on exchange "${exchangeId}":`,
            ticker,
          );
          continue;
        }

        const priceData: PriceData = {
          bid: ticker.bid as number,
          ask: ticker.ask as number,
          volume: ticker.quoteVolume || 0,
          timestamp: Date.now(),
        };

        updates.push({
          exchangeId,
          symbol,
          data: priceData,
        });

        if (symbol.toUpperCase() === "BABYBONK/USDT") {
          logger.info(
            `Logging specific ticker for BABYBONK/USDT on ${exchangeId}`,
          );
        }
      }

      if (updates.length > 0) {
        Cache.batchUpdatePrices(updates);
        logger.debug(
          `Updated cache with ${updates.length} ticker(s) for exchange "${exchangeId}".`,
        );
      } else {
        logger.warn(
          `No valid tickers found to update cache for exchange "${exchangeId}".`,
        );
      }
    } catch (error) {
      logger.error(
        `Unexpected error in fetchLatestTickers for ${exchangeId}:`,
        error,
      );
    }
  }

  private async startOpportunitiesLoop(interval: number): Promise<void> {
    const loop = async () => {
      while (true) {
        try {
          const opportunities = await this.findOpportunities();

          for (const op of opportunities) {
            try {
              await db
                .insert(opportunitiesTable)
                .values({
                  type: op.type,
                  buyExchange:
                    "buyExchange" in op ? op.buyExchange : op.exchange,
                  sellExchange:
                    "sellExchange" in op ? op.sellExchange : op.exchange,
                  symbol: "symbol" in op ? op.symbol : op.trades[0].symbol,
                  profitPercentage: op.profitPercentage.toString(),
                  buyPrice:
                    "buyPrice" in op
                      ? op.buyPrice.toFixed(20)
                      : (op.trades
                          .find((t) => t.action === "buy")
                          ?.price.toFixed(20) ?? "0"),
                  sellPrice:
                    "sellPrice" in op
                      ? op.sellPrice.toFixed(20)
                      : (op.trades
                          .find((t) => t.action === "sell")
                          ?.price.toFixed(20) ?? "0"),
                  volume: op.minVolume.toString(),
                  timestamp: new Date(),
                })
                .onConflictDoUpdate({
                  target: [
                    opportunitiesTable.buyExchange,
                    opportunitiesTable.sellExchange,
                    opportunitiesTable.symbol,
                  ],
                  set: {
                    profitPercentage: op.profitPercentage.toString(),
                    buyPrice:
                      "buyPrice" in op
                        ? op.buyPrice.toFixed(20)
                        : (op.trades
                            .find((t) => t.action === "buy")
                            ?.price.toFixed(20) ?? "0"),
                    sellPrice:
                      "sellPrice" in op
                        ? op.sellPrice.toFixed(20)
                        : (op.trades
                            .find((t) => t.action === "sell")
                            ?.price.toFixed(20) ?? "0"),
                    volume: op.minVolume.toString(),
                    timestamp: new Date(),
                  },
                });

              this.emit("opportunity", op);
            } catch (error) {
              logger.error("Error saving opportunity to database:", error);
            }
          }

          logger.info(
            `Waiting ${interval / 1000} seconds before next cycle...\n`,
          );
          await this.delay(interval);
        } catch (error) {
          logger.error("Error in main loop", error);
          await this.delay(interval);
        }
      }
    };

    // Start the loop without blocking the main thread
    loop().catch((error) => {
      logger.error("Opportunities loop encountered an error:", error);
    });
  }

  public async start(interval: number = 15000): Promise<void> {
    logger.info(
      `Starting arbitrage bot on exchanges: ${Array.from(
        this.exchangeManager.getAllExchanges(),
      )
        .map((e) => e.id)
        .join(", ")}`,
    );
    await this.fetchTradingPairs();

    // Start the cleanup interval
    setInterval(() => {
      this.cleanupExpiredOpportunities().catch((error) => {
        logger.error("Failed to cleanup expired opportunities:", error);
      });
    }, this.DB_CLEANUP_INTERVAL);

    // Start the active opportunities check loop
    this.startActiveOpportunitiesCheckLoop();

    // Start the main opportunities loop
    this.startOpportunitiesLoop(interval);
  }
}
