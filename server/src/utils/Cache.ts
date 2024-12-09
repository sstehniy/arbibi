// --- src/utils/Cache.ts ---
import { logger } from "./Logger";
import { PriceData } from "../types";
import { LRUCache } from "lru-cache";

export interface CacheData {
  tradingPairs: Map<string, string[]>;
  priceCache: LRUCache<string, PriceData>;
  quoteCurrencies: Map<string, Set<string>>;
  timestamp: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

type NetworkCacheData =
  | {
      network: string | null;
      withdrawalFee: number | null;
      depositEnabled: boolean | null;
    }[]
  | 0;

export class Cache {
  private static readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
  private static readonly PRICE_CACHE_MAX_SIZE = 10000; // Adjust as needed
  private static readonly PRICE_CACHE_TTL = 2000; // 2 seconds in milliseconds

  // Initialize LRU cache for priceCache
  public static priceCache = new LRUCache<string, PriceData>({
    max: Cache.PRICE_CACHE_MAX_SIZE,
    ttl: Cache.PRICE_CACHE_TTL,
    allowStale: false,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
  });

  // New LRUCache for findAvailableNetworksWithFees
  private static readonly NETWORK_FEES_CACHE_MAX_SIZE = 5000; // Adjust as needed
  private static readonly NETWORK_FEES_CACHE_TTL = 2 * 60 * 1000; // 2 minutes in milliseconds

  private static networkFeesCache = new LRUCache<string, NetworkCacheData>({
    max: Cache.NETWORK_FEES_CACHE_MAX_SIZE,
    ttl: Cache.NETWORK_FEES_CACHE_TTL,
    allowStale: false,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
  });

  private static stats: Omit<CacheStats, "hitRate"> = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
  };

  /**
   * Saves market data to the in-memory cache.
   * @param data - The market data to cache.
   */
  static saveMarketData(data: CacheData): void {
    try {
      // Since all data is in memory, update the internal maps directly
      data.tradingPairs.forEach((pairs, exchangeId) => {
        Cache.tradingPairs.set(exchangeId, pairs);
      });

      data.quoteCurrencies.forEach((currencies, exchangeId) => {
        Cache.quoteCurrencies.set(exchangeId, currencies);
      });

      Cache.timestamp = data.timestamp;

      // Note: priceCache is already managed via LRUCache
      logger.info("Updated in-memory market data cache");
    } catch (error) {
      logger.error("Error updating in-memory market data cache:", error);
    }
  }

  /**
   * Loads market data from the in-memory cache if valid.
   * @returns The cached market data or null if invalid or unavailable.
   */
  static loadMarketData(): CacheData | null {
    try {
      if (Date.now() - Cache.timestamp > Cache.CACHE_EXPIRY) {
        logger.info("In-memory cache is expired");
        return null;
      }

      logger.info("Using in-memory cached market data");
      return {
        tradingPairs: new Map(Cache.tradingPairs),
        priceCache: Cache.priceCache,
        quoteCurrencies: new Map(Cache.quoteCurrencies),
        timestamp: Cache.timestamp,
      };
    } catch (error) {
      logger.error("Error accessing in-memory market data cache:", error);
      return null;
    }
  }

  /**
   * Retrieves a cached price if available.
   * @param exchangeId - The ID of the exchange.
   * @param symbol - The trading symbol.
   * @returns The cached PriceData or null if not found.
   */
  static getCachedPrice(exchangeId: string, symbol: string): PriceData | null {
    Cache.stats.totalRequests++;
    const key = `${exchangeId}:${symbol}`;
    const cachedEntry = Cache.priceCache.get(key);

    if (cachedEntry) {
      Cache.stats.hits++;
      return cachedEntry;
    } else {
      Cache.stats.misses++;
      return null;
    }
  }

  /**
   * Batch updates multiple prices into the cache.
   * @param updates - An array of updates containing exchangeId, symbol, and PriceData.
   */
  static batchUpdatePrices(
    updates: { exchangeId: string; symbol: string; data: PriceData }[],
  ): void {
    for (const { exchangeId, symbol, data } of updates) {
      const key = `${exchangeId}:${symbol}`;
      Cache.priceCache.set(key, data, { ttl: Cache.PRICE_CACHE_TTL });
    }
  }

  /**
   * Retrieves cache statistics.
   * @returns An object containing hits, misses, totalRequests, and hitRate.
   */
  static getCacheStats(): CacheStats {
    const { hits, misses, totalRequests } = Cache.stats;
    const hitRate = totalRequests > 0 ? (hits / totalRequests) * 100 : 0;
    return { hits, misses, totalRequests, hitRate };
  }

  /**
   * Resets the cache statistics.
   */
  static resetStats(): void {
    Cache.stats = { hits: 0, misses: 0, totalRequests: 0 };
  }

  // In-memory storage for tradingPairs and quoteCurrencies
  private static tradingPairs: Map<string, string[]> = new Map();
  private static quoteCurrencies: Map<string, Set<string>> = new Map();
  private static timestamp: number = 0;

  /**
   * Retrieves cached network fees if available.
   * @param key - The cache key composed of buyExchangeId, sellExchangeId, and currencyCode.
   * @returns The cached network fees or undefined if not found.
   */
  static getAvailableNetworksWithFees(
    key: string,
  ): NetworkCacheData | undefined {
    return Cache.networkFeesCache.get(key);
  }

  /**
   * Caches the network fees for a specific key.
   * @param key - The cache key composed of buyExchangeId, sellExchangeId, and currencyCode.
   * @param data - The network fees data to cache.
   */
  static setAvailableNetworksWithFees(
    key: string,
    data: NetworkCacheData | undefined,
  ): void {
    Cache.networkFeesCache.set(key, data);
  }
}
