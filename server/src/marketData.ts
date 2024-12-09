import ccxt, { Exchange } from "ccxt";
import { exchangeConfigs } from "./config/exchangeConfigs";
import fs from "node:fs";

const marketData = await Promise.all(
  Object.keys(exchangeConfigs).map(async (exchangeId) => {
    console.log(
      `Fetching deposit withdraw fee for ${exchangeId}, ${exchangeConfigs[exchangeId].apiKey}`,
    );
    const exchange = new ccxt[exchangeId]({
      apiKey: exchangeConfigs[exchangeId].apiKey,
      secret: exchangeConfigs[exchangeId].secret,
      password: exchangeConfigs[exchangeId].password,
      uid: exchangeConfigs[exchangeId].uid,
    }) as Exchange;
    try {
      const withdrawFee = await exchange.fetchDepositWithdrawFee("DOGE");
      return {
        exchangeId,
        withdrawFee,
      };
    } catch (error) {
      console.error(
        `Error fetching deposit withdraw fee for ${exchangeId}:`,
        error,
      );
      return {
        exchangeId,
        error: error.message,
      };
    }
  }),
);

fs.writeFileSync("marketData.json", JSON.stringify(marketData, null, 2));
