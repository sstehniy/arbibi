import ccxt, { Exchange } from "ccxt";
import { exchangeConfigs } from "./config/exchangeConfigs";

async function testExchangeCompatibility(exchangeId: string): Promise<void> {
  // Check if the exchange is supported by ccxt
  if (!ccxt.exchanges.includes(exchangeId) || !exchangeConfigs[exchangeId]) {
    console.error(`Exchange ${exchangeId} is not supported by CCXT.`);
    return;
  }

  // Initialize the exchange
  const ExchangeClass = (ccxt as any)[exchangeId];
  const exchange: Exchange = new ExchangeClass({
    enableRateLimit: true,
    timeout: 30000,
    ...exchangeConfigs[exchangeId],
  });

  // Set defaultType to 'spot' for Bybit
  if (exchangeId === "bybit") {
    exchange.options["defaultType"] = "spot";
  }

  console.log(`\nTesting exchange: ${exchangeId}\n`);

  try {
    // Test loadMarkets()
    console.log(`Loading markets for ${exchangeId}...`);
    await exchange.loadMarkets();
    console.log(`Loaded ${Object.keys(exchange.markets).length} markets.`);

    // Filter to spot markets only
    const spotMarkets = Object.values(exchange.markets).filter(
      (market) => market.type === "spot",
    );
    console.log(`Total spot markets: ${spotMarkets.length}`);

    // Test fetchTickers() for spot markets
    console.log(`Fetching tickers for ${exchangeId} spot markets...`);
    const spotSymbols = spotMarkets.map((market) => market.symbol);

    // Fetch tickers for spot symbols
    const tickers = await exchange.fetchTickers(spotSymbols);
    console.log(`Fetched ${Object.keys(tickers).length} tickers.`);

    // Adjust symbols by stripping ':USDT' for Bybit
    if (exchangeId === "bybit") {
      const adjustedTickers: Record<string, any> = {};
      for (const [symbol, ticker] of Object.entries(tickers)) {
        const adjustedSymbol = symbol.includes(":")
          ? symbol.split(":")[0]
          : symbol;
        adjustedTickers[adjustedSymbol] = ticker;
      }
      // Save adjusted tickers to file
      Bun.write(
        `./tickers/${exchangeId}_adjusted.json`,
        JSON.stringify(adjustedTickers, null, 2),
      );
    } else {
      // Save tickers to file
      Bun.write(
        `./tickers/${exchangeId}.json`,
        JSON.stringify(tickers, null, 2),
      );
    }

    // Test fetchDepositWithdrawFee() if available
    if (typeof exchange.fetchDepositWithdrawFee === "function") {
      console.log(`Fetching deposit and withdrawal fees for ${exchangeId}...`);
      const currencies = Object.keys(exchange.currencies);
      if (currencies.length > 0) {
        const currency = currencies[0]; // Test with the first currency
        const feeInfo = await exchange.fetchDepositWithdrawFee(currency);
        console.log(`Fetched fee info for currency ${currency}:`, feeInfo);
      } else {
        console.warn(`No currencies found for ${exchangeId}.`);
      }
    } else {
      console.warn(
        `Exchange ${exchangeId} does not implement fetchDepositWithdrawFee().`,
      );
    }

    console.log(
      `\nExchange ${exchangeId} is compatible with the current implementation.\n`,
    );
  } catch (error) {
    console.error(`\nError testing exchange ${exchangeId}:`, error);
    console.error(
      `\nExchange ${exchangeId} is NOT compatible with the current implementation.\n`,
    );
  }
}

testExchangeCompatibility("okx");
