import { ArbitrageBot } from "./ArbitrageBot";
import { Opportunity } from "./types";
import { logger } from "./utils/Logger";
import { db } from "./db";
import { opportunitiesTable } from "./db/schema";
import { desc, asc, gte, and, lte, inArray, SQLWrapper, eq } from "drizzle-orm";
import { exchangeConfigs } from "./config/exchangeConfigs";
import { ExchangeManager } from "./ExchangeManager";

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason as Error);
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    const exchangeManager = new ExchangeManager(exchangeConfigs);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle OPTIONS request for CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    if (url.pathname === "/opportunities" && req.method === "GET") {
      try {
        const sortBy = url.searchParams.get("sortBy") || "timestamp";

        const minVolume = Number(url.searchParams.get("minVolume")) || 0;

        const minPercentage =
          Number(url.searchParams.get("minPercentage")) || 0.5;
        const maxPercentage =
          Number(url.searchParams.get("maxPercentage")) || 100;

        const buyExchanges = url.searchParams.get("buyExchanges");
        const sellExchanges = url.searchParams.get("sellExchanges");
        let buyExchangesArray: string[] = [];
        let sellExchangesArray: string[] = [];
        if (buyExchanges) {
          buyExchangesArray = buyExchanges
            .split(",")
            .map((e) => e.toLowerCase());
        }
        if (sellExchanges) {
          sellExchangesArray = sellExchanges
            .split(",")
            .map((e) => e.toLowerCase());
        }

        const whereClauses: SQLWrapper[] =
          buyExchangesArray.length > 0 || sellExchangesArray.length > 0
            ? [
                inArray(opportunitiesTable.sellExchange, sellExchangesArray),
                inArray(opportunitiesTable.buyExchange, buyExchangesArray),
              ]
            : [];

        const baseQuery = {
          where: and(
            gte(opportunitiesTable.volume, String(minVolume)),
            gte(opportunitiesTable.profitPercentage, String(minPercentage)),
            lte(opportunitiesTable.profitPercentage, String(maxPercentage)),
            and(...whereClauses),
          ),
        };

        const orderByMap = {
          volume: desc(opportunitiesTable.volume),
          spread_asc: asc(opportunitiesTable.profitPercentage),
          spread_desc: desc(opportunitiesTable.profitPercentage),
          timestamp: desc(opportunitiesTable.timestamp),
        };

        const opportunities = await db
          .select()
          .from(opportunitiesTable)
          .where(baseQuery.where)
          .orderBy(orderByMap[sortBy as keyof typeof orderByMap]);

        const formattedOpportunities = opportunities.map((opp) => ({
          ...opp,
          profitPercentage: Number(opp.profitPercentage),
          buyPrice: opp.buyPrice,
          sellPrice: opp.sellPrice,
          volume: Number(opp.volume),
          type: "Cross-Exchange" as const,
          path: [
            `${opp.symbol} on ${opp.buyExchange}`,
            `${opp.symbol} on ${opp.sellExchange}`,
          ],
          minVolume: Number(opp.volume),
        }));

        return new Response(JSON.stringify(formattedOpportunities), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (error) {
        logger.error("Error fetching opportunities:", error);
        return new Response(
          JSON.stringify({ error: "Internal Server Error" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          },
        );
      }
    }

    if (url.pathname === "/opportunity" && req.method === "GET") {
      const symbol = url.searchParams.get("symbol");
      const buyExchange = url.searchParams.get("buyExchange");
      const sellExchange = url.searchParams.get("sellExchange");

      const opportunity = await db
        .select()
        .from(opportunitiesTable)
        .where(
          and(
            eq(opportunitiesTable.symbol, symbol),
            eq(opportunitiesTable.buyExchange, buyExchange),
            eq(opportunitiesTable.sellExchange, sellExchange),
          ),
        );

      if (opportunity.length === 0) {
        return new Response(JSON.stringify(null), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }
      const opp = opportunity[0];
      const formattedOpportunity = {
        ...opp,
        profitPercentage: Number(opp.profitPercentage),
        buyPrice: opp.buyPrice,
        sellPrice: opp.sellPrice,
        volume: Number(opp.volume),
        type: "Cross-Exchange" as const,
        path: [
          `${opp.symbol} on ${opp.buyExchange}`,
          `${opp.symbol} on ${opp.sellExchange}`,
        ],
        minVolume: Number(opp.volume),
      };
      return new Response(JSON.stringify(formattedOpportunity), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    if (url.pathname === "/active-exchanges" && req.method === "GET") {
      return new Response(
        JSON.stringify(
          Object.keys(exchangeConfigs).map((ec) => ec.toUpperCase()),
        ),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        },
      );
    }

    if (
      url.pathname === "/opportunity-network-and-fee" &&
      req.method === "GET"
    ) {
      const coinToWithdraw = url.searchParams.get("coinToWithdraw");
      const buyExchange = url.searchParams.get("buyExchange");
      const sellExchange = url.searchParams.get("sellExchange");
      if (!coinToWithdraw || !buyExchange || !sellExchange) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      }

      const networkAndFee = await exchangeManager.findAvailableNetworksWithFees(
        buyExchange,
        sellExchange,
        coinToWithdraw,
      );

      return new Response(JSON.stringify(networkAndFee), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    // Handle 404 for unknown routes
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
});

logger.info(`HTTP server started on port ${server.port}`);

(async () => {
  logger.info("Starting ArbiBot application");

  const arbitrageBot = new ArbitrageBot(
    exchangeConfigs,
    0.001, // 0.1% minimum profit threshold
    1, // 100% max profit
    150000, // Reduced to 2000 trading pairs per exchange to avoid rate limits
  );

  // Subscribe to arbitrage opportunities and forward to trading bot
  arbitrageBot.on("opportunity", async (opportunity: Opportunity) => {
    logger.info(
      `New ${opportunity.type} opportunity found with profit: ${opportunity.profitPercentage.toFixed(
        2,
      )}%`,
    );
  });

  try {
    await arbitrageBot.start(15000);
  } catch (error) {
    logger.error("Fatal error in bot execution", error as Error);
    process.exit(1);
  }
})();
