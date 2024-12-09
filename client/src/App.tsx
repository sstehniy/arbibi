// src/App.tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ArbitrageHeader,
  MAX_PERCENTAGE,
  MIN_PERCENTAGE,
} from "./components/ArbitrageHeader";
import type { CrossExchangeOpportunity, Opportunity } from "./types";
import { useOpportunities, SortBy } from "./hooks/opportunities";

import { useLocalStorage } from "react-use";
import TableView from "./components/TableView";
import { OpportunityList } from "./components/OpportunityList";
import { useActiveExchanges } from "./hooks/activeExchanges";
import { Label } from "./components/ui/label";
import { Switch } from "./components/ui/switch";
import { Table } from "lucide-react";

export type PinnedOpportunity = CrossExchangeOpportunity & {
  expired: boolean;
};

export type Filters = {
  minVolume: number;
  minSpread: number;
  maxSpread: number;
  buyExchanges: { value: string; active: boolean }[];
  sellExchanges: { value: string; active: boolean }[];
};

const defaultFilters: Filters = {
  minVolume: 10000,
  minSpread: MIN_PERCENTAGE,
  maxSpread: MAX_PERCENTAGE,
  buyExchanges: [],
  sellExchanges: [],
};

export default function App() {
  const { data: activeExchanges } = useActiveExchanges();

  const [sortBy, setSortBy] = useLocalStorage<SortBy>(
    "arbibot-sort",
    "timestamp",
  );
  const [pinnedOpportunities, setPinnedOpportunities] = useState<
    PinnedOpportunity[]
  >([]);
  const [filters, setFilters] = useLocalStorage<Filters>("arbibot-filters", {
    minVolume: 0,
    minSpread: MIN_PERCENTAGE,
    maxSpread: MAX_PERCENTAGE,
    buyExchanges: [],
    sellExchanges: [],
  });

  useEffect(() => {
    setFilters((prev) => {
      if (!prev) return { ...defaultFilters };
      const exchanges = (activeExchanges || []).map((exchange) => ({
        value: exchange,
        active: true,
      }));
      return {
        ...prev,
        buyExchanges: [...exchanges],
        sellExchanges: [...exchanges],
      };
    });
  }, [activeExchanges, setFilters]);

  console.log(filters);

  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const {
    opportunities: {
      data: opportunities,
      error,
      isLoading,
      isRefetching,
      refetch,
    },
    handleRefreshConfigChange,
    refreshConfig,
  } = useOpportunities({
    sortBy: sortBy || "timestamp",
    minVolume: filters?.minVolume || 0,
    minSpread: filters?.minSpread || MIN_PERCENTAGE,
    maxSpread: filters?.maxSpread || MAX_PERCENTAGE,
    buyExchanges: filters?.buyExchanges || [],
    sellExchanges: filters?.sellExchanges || [],
  });

  const handlePin = useCallback(
    (opportunity: CrossExchangeOpportunity | CrossExchangeOpportunity[]) => {
      setPinnedOpportunities((prev) => {
        const opportunities = Array.isArray(opportunity)
          ? opportunity
          : [opportunity];

        const newOpportunities = opportunities.filter(
          (opp) =>
            !prev?.some(
              (pinned) =>
                pinned.symbol === opp.symbol &&
                pinned.buyExchange === opp.buyExchange &&
                pinned.sellExchange === opp.sellExchange,
            ),
        );

        if (newOpportunities.length === 0) {
          return prev;
        }

        return [
          ...(prev || []),
          ...newOpportunities.map((opp) => ({
            ...opp,
            expired: false,
          })),
        ];
      });
    },
    [],
  );

  const handleResetFilters = useCallback(() => {
    setFilters({
      ...defaultFilters,
      buyExchanges: (activeExchanges || []).map((exchange) => ({
        value: exchange,
        active: true,
      })),
      sellExchanges: (activeExchanges || []).map((exchange) => ({
        value: exchange,
        active: true,
      })),
    });
  }, [setFilters, activeExchanges]);

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "card" ? "table" : "card"));
  };

  const handleUnpin = useCallback(
    (opportunity: CrossExchangeOpportunity | CrossExchangeOpportunity[]) => {
      setPinnedOpportunities((prev) => {
        const opportunities = Array.isArray(opportunity)
          ? opportunity
          : [opportunity];

        return prev?.filter(
          (pinned) =>
            !opportunities.some(
              (opp) =>
                pinned.symbol === opp.symbol &&
                pinned.buyExchange === opp.buyExchange &&
                pinned.sellExchange === opp.sellExchange,
            ),
        );
      });
    },
    [],
  );

  const handleFilterChange = useCallback(
    (newFilters: typeof filters) => {
      setFilters(newFilters);
    },
    [setFilters],
  );

  const handleSortChange = useCallback(
    (newSortBy: SortBy) => {
      setSortBy(newSortBy);
    },
    [setSortBy],
  );

  const handleDeleteOnExpire = useCallback(
    (opportunity: CrossExchangeOpportunity) => {
      setPinnedOpportunities((prev) =>
        prev?.filter((pinned) => pinned.symbol !== opportunity.symbol),
      );
    },
    [],
  );

  const groupedOpportunities = useMemo(() => {
    const groups: Record<string, Opportunity[]> = {};
    opportunities?.forEach((opp) => {
      if (opp.type === "Cross-Exchange") {
        if (!groups[opp.symbol]) {
          groups[opp.symbol] = [];
        }

        groups[opp.symbol].push(opp as CrossExchangeOpportunity);
      }
    });
    // Sort opportunities within each group by percentage high to low
    Object.keys(groups).forEach((symbol) => {
      groups[symbol].sort((a, b) => {
        switch (sortBy) {
          case "spread_asc":
            return a.profitPercentage - b.profitPercentage;
          case "spread_desc":
            return b.profitPercentage - a.profitPercentage;
          case "volume":
            return b.minVolume - a.minVolume;
          case "timestamp":
            return b.timestamp.localeCompare(a.timestamp);
          default:
            return 0;
        }
      });
    });
    return groups;
  }, [opportunities, sortBy]);

  const pinnedGroupedOpportunities: Record<string, PinnedOpportunity[]> =
    useMemo(() => {
      const groups: Record<string, PinnedOpportunity[]> = {};
      pinnedOpportunities.forEach((opp) => {
        if (!groups[opp.symbol]) {
          groups[opp.symbol] = [];
        }
        groups[opp.symbol].push(opp);
      });
      return groups;
    }, [pinnedOpportunities]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="max-w-full mx-auto">
          <div className="flex items-center mb-4">
            <ArbitrageHeader
              onFilterChange={handleFilterChange}
              filters={filters || defaultFilters}
              refreshConfig={refreshConfig}
              handleRefreshConfigChange={handleRefreshConfigChange}
              handleResetFilters={handleResetFilters}
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 mb-5">
              <Switch
                id="view-mode"
                checked={viewMode === "table"}
                onCheckedChange={toggleViewMode}
              />
              <Label
                htmlFor="view-mode"
                className="flex items-center space-x-2"
              >
                <span>{viewMode === "card" ? "Card" : "Table"} View</span>
                {viewMode === "card" ? (
                  <Table className="h-4 w-4" />
                ) : (
                  <div className="h-4 w-4 border border-current rounded" />
                )}
              </Label>
            </div>
          </div>
          {viewMode === "card" ? (
            <OpportunityList
              onSortChange={handleSortChange}
              sortBy={sortBy || "timestamp"}
              groupedOpportunities={groupedOpportunities}
              error={error}
              isLoading={isLoading}
              onPin={handlePin}
              onUnpin={handleUnpin}
              pinnedOpportunities={pinnedOpportunities || []}
              handleDeleteOnExpire={handleDeleteOnExpire}
              refreshConfig={refreshConfig}
              isRefetching={isRefetching || isLoading}
              refetch={refetch}
              pinnedGroupedOpportunities={pinnedGroupedOpportunities}
            />
          ) : (
            <TableView
              opportunities={opportunities || []}
              pinnedOpportunities={pinnedOpportunities || []}
              onPin={handlePin}
              onUnpin={handleUnpin}
              refreshConfig={refreshConfig}
              isRefetching={isRefetching || isLoading}
              isLoading={isLoading}
              refetch={refetch}
              onSortChange={handleSortChange}
              initialSortBy={sortBy || "timestamp"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
