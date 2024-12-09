import { ExchangeConfig } from "../types";

export const exchangeConfigs = {
  okx: {
    apiKey: process.env.OKX_API_KEY,
    secret: process.env.OKX_API_SECRET,
    password: process.env.OKX_PASSWORD,
  },
  binance: {
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_API_SECRET,
    password: process.env.BINANCE_PASSWORD,
  },
  mexc: {
    apiKey: process.env.MEXC_API_KEY,
    secret: process.env.MEXC_API_SECRET,
    password: process.env.MEXC_PASSWORD,
  },
  gateio: {
    apiKey: process.env.GATEIO_API_KEY,
    secret: process.env.GATEIO_API_SECRET,
    password: process.env.GATEIO_PASSWORD,
  },
  bitget: {
    apiKey: process.env.BITGET_API_KEY,
    secret: process.env.BITGET_API_SECRET,
    password: process.env.BITGET_PASSWORD,
  },
  bingx: {
    apiKey: process.env.BINGX_API_KEY,
    secret: process.env.BINGX_API_SECRET,
    password: process.env.BINGX_PASSWORD,
  },
  bitmart: {
    apiKey: process.env.BITMART_API_KEY,
    secret: process.env.BITMART_API_SECRET,
    password: process.env.BITMART_PASSWORD,
    uid: process.env.BITMART_UID,
  },
  bitmex: {
    apiKey: process.env.BITMEX_API_KEY,
    secret: process.env.BITMEX_API_SECRET,
    password: process.env.BITMEX_PASSWORD,
  },
  bybit: {
    apiKey: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
    password: process.env.BYBIT_PASSWORD,
    uid: process.env.BYBIT_UID,
  },
  poloniex: {
    apiKey: process.env.POLONIEX_API_KEY,
    secret: process.env.POLONIEX_API_SECRET,
    password: process.env.POLONIEX_PASSWORD,
  },
  huobi: {
    apiKey: process.env.HUOBI_API_KEY,
    secret: process.env.HUOBI_API_SECRET,
    password: process.env.HUOBI_PASSWORD,
  },
  kucoin: {
    apiKey: process.env.KUCOIN_API_KEY,
    secret: process.env.KUCOIN_API_SECRET,
    password: process.env.KUCOIN_PASSWORD,
  },
} as ExchangeConfig;
