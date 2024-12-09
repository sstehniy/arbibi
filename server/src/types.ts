export interface PriceData {
  bid: number;
  ask: number;
  volume: number;
  timestamp: number;
}

export interface PriceCacheEntry {
  data: PriceData;
  timestamp: number;
}

export interface CachedBotConfig {
  minProfitThreshold: number;
  maxProfitThreshold: number;
  maxPairs: number;
  exchanges: string[];
}

export type OpportunityType = "Cross-Exchange" | "Triangle";

export interface BaseOpportunity {
  type: OpportunityType;
  path: string[];
  profitPercentage: number;
  minVolume: number;
  timestamp: string;
}

export interface CrossExchangeOpportunity extends BaseOpportunity {
  type: "Cross-Exchange";
  buyPrice: number;
  sellPrice: number;
  buyExchange: string;
  sellExchange: string;
  symbol: string;
}

export interface TriangleOpportunity extends BaseOpportunity {
  type: "Triangle";
  exchange: string;
  trades: {
    symbol: string;
    action: "buy" | "sell";
    price: number;
  }[];
}

export type Opportunity = CrossExchangeOpportunity | TriangleOpportunity;

export interface FindBestNetworkRequest {
  type: "Cross-Exchange" | "Triangle";
  symbol: string;
  buyExchange: string;
  sellExchange: string;
}

export interface NetworkOption {
  network: string;
  withdrawalFee: number;
  estimatedTransferTime?: string;
}

export interface FindBestNetworkResponse {
  buyExchange: string;
  sellExchange: string;
  symbol: string;
  buyExchangeNetwork?: NetworkOption;
  sellExchangeNetwork?: NetworkOption;
  message?: string; // For errors or additional info
}

export interface NetworkDetails {
  withdrawalFee: number;
  minWithdrawAmount: number;
  browserUrl?: string;
  contractAddress?: string;
  withdrawConfirm?: number;
  depositConfirm?: number;
  congestion?: string;
  withdrawStep?: string;
  withdrawMinScale?: string;
}

export interface AssetNetworks {
  [network: string]: NetworkDetails;
}

export interface ExchangeAssets {
  [asset: string]: AssetNetworks;
}

export interface NetworkMapping {
  [exchange: string]: ExchangeAssets;
}

export interface ExchangeConfig {
  [exchange: string]: {
    apiKey?: string;
    secret?: string;
    password?: string;
    uid?: string;
  };
}
