DROP TABLE IF EXISTS opportunities;
CREATE TABLE IF NOT EXISTS opportunities (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    buy_exchange TEXT NOT NULL,
    sell_exchange TEXT NOT NULL,
    symbol TEXT NOT NULL,
    profit_percentage DECIMAL(10, 2) NOT NULL,
    buy_price TEXT NOT NULL,
    sell_price TEXT NOT NULL,
    volume DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_opportunity_constraint UNIQUE (buy_exchange, sell_exchange, symbol)
);
CREATE INDEX IF NOT EXISTS timestamp_idx ON opportunities(timestamp);
CREATE INDEX IF NOT EXISTS idx_opportunities_profit ON opportunities(profit_percentage);