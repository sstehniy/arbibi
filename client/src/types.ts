// src/types.ts
export interface BaseOpportunity {
  profitPercentage: number;
  minVolume: number;
  timestamp: string;
  path: string[];
}

export interface CrossExchangeOpportunity extends BaseOpportunity {
  type: "Cross-Exchange";
  buyPrice: string;
  sellPrice: string;
  buyExchange: string;
  sellExchange: string;
  symbol: string;
  expired?: boolean; // Optional flag to indicate expiration
}

export type Opportunity = CrossExchangeOpportunity;
