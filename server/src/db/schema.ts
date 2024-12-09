import { pgTable, text, timestamp, decimal, unique } from "drizzle-orm/pg-core";

export const opportunitiesTable = pgTable(
  "opportunities",
  {
    type: text("type").notNull(),
    buyExchange: text("buy_exchange").notNull(),
    sellExchange: text("sell_exchange").notNull(),
    symbol: text("symbol").notNull(),
    profitPercentage: decimal("profit_percentage", {
      precision: 10,
      scale: 2,
    }).notNull(),
    buyPrice: text("buy_price").notNull(),
    sellPrice: text("sell_price").notNull(),
    volume: decimal("volume", { precision: 20, scale: 8 }).notNull(),
    timestamp: timestamp("timestamp").notNull(),
  },
  (table) => ({
    opportunityConstraint: unique("unique_opportunity_constraint").on(
      table.buyExchange,
      table.sellExchange,
      table.symbol,
    ),
  }),
);
