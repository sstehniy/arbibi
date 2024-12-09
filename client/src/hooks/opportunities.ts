import { useQuery } from "@tanstack/react-query";
import { CrossExchangeOpportunity, Opportunity } from "../types";
import { useCallback, useState } from "react";
import { API_URL } from "@/main";
import { Filters } from "@/App";

export type SortBy = "timestamp" | "volume" | "spread_asc" | "spread_desc";

export const DEFAULT_REFRESH_CONFIG: RefreshConfig = {
  enabled: true,
  interval: 60000,
};

async function fetchOpportunities(
  filters: Filters & { sortBy: SortBy },
): Promise<Opportunity[]> {
  const {
    sortBy,
    minVolume,
    minSpread,
    maxSpread,
    buyExchanges,
    sellExchanges,
  } = filters;
  const response = await fetch(
    `${API_URL}/opportunities?sortBy=${sortBy}&minVolume=${minVolume}&minPercentage=${minSpread}&maxPercentage=${maxSpread}&buyExchanges=${buyExchanges
      .filter((v) => v.active)
      .map((e) => e.value.toLowerCase())
      .join(",")}&sellExchanges=${sellExchanges
      .filter((v) => v.active)
      .map((e) => e.value.toLowerCase())
      .join(",")}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch opportunities");
  }
  return response.json();
}

export type RefreshConfig = {
  enabled: boolean;
  interval: number;
};

export function useOpportunities(filters: Filters & { sortBy: SortBy }) {
  const [refreshConfig, setRefreshConfig] = useState<RefreshConfig>(
    DEFAULT_REFRESH_CONFIG,
  );

  const handleRefreshConfigChange = useCallback(
    (field: keyof RefreshConfig, value: any) => {
      setRefreshConfig((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  return {
    opportunities: useQuery<Opportunity[], Error>({
      queryKey: [
        "opportunities",
        filters.maxSpread,
        filters.minSpread,
        filters.minVolume,
        filters.sortBy,
        filters.buyExchanges,
        filters.sellExchanges,
        refreshConfig.enabled,
        refreshConfig.interval,
      ],
      queryFn: () => fetchOpportunities(filters),
      refetchInterval: refreshConfig?.enabled ? refreshConfig?.interval : false,
    }),
    handleRefreshConfigChange,
    refreshConfig,
  };
}

async function fetchOpportunity(opp: CrossExchangeOpportunity) {
  const data = await fetch(
    `${API_URL}/opportunity?symbol=${opp.symbol}&buyExchange=${opp.buyExchange}&sellExchange=${opp.sellExchange}`,
  );
  if (!data.ok) {
    throw new Error("Failed to fetch opportunity");
  }
  return data.json();
}

export function useOpportunity(initialOpp: CrossExchangeOpportunity) {
  return useQuery<CrossExchangeOpportunity, Error>({
    queryKey: [
      "opportunity",
      initialOpp.symbol,
      initialOpp.buyExchange,
      initialOpp.sellExchange,
    ],
    queryFn: () => fetchOpportunity(initialOpp),
    enabled:
      !!initialOpp.symbol &&
      !!initialOpp.buyExchange &&
      !!initialOpp.sellExchange,
    initialData: initialOpp,
    refetchInterval: 5000,
    select: (data) => data ?? { ...initialOpp, expired: true },
  });
}
