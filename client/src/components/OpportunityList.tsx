import { PinnedOpportunity } from "@/App";
import { CrossExchangeOpportunity } from "@/types";
import { memo } from "react";
import { TradingPairCard } from "./CrossExchangeCard";
import { RefreshConfig, SortBy } from "@/hooks/opportunities";
import { PinnedTradingPairCard } from "./PinnedCard";
import RefreshButton from "./RefreshButton";
import { RefreshCw } from "lucide-react";
import BaseCardWrapperSkeleton from "./BaseCardWrapperSkeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const OpportunityListComponent: React.FC<{
  error: Error | null;
  isLoading: boolean;
  onPin: (
    opportunity: CrossExchangeOpportunity | CrossExchangeOpportunity[],
  ) => void;
  onUnpin: (
    opportunity: CrossExchangeOpportunity | CrossExchangeOpportunity[],
  ) => void;
  pinnedOpportunities: PinnedOpportunity[];
  groupedOpportunities: Record<string, CrossExchangeOpportunity[]>;
  sortBy: SortBy;
  handleDeleteOnExpire: (opportunity: CrossExchangeOpportunity) => void;
  refreshConfig: RefreshConfig;
  isRefetching: boolean;
  refetch: () => void;
  onSortChange: (sortBy: SortBy) => void;
  pinnedGroupedOpportunities: Record<string, PinnedOpportunity[]>;
}> = memo(
  ({
    error,
    isLoading,
    onPin,
    onUnpin,
    pinnedOpportunities,
    groupedOpportunities,
    handleDeleteOnExpire,
    refreshConfig,
    isRefetching,
    refetch,
    sortBy: initialSortBy,
    onSortChange,
    pinnedGroupedOpportunities,
  }) => {
    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl font-semibold text-red-600">
            Error: {error.message}
          </div>
        </div>
      );
    }

    return (
      <div>
        {Object.keys(pinnedGroupedOpportunities).length > 0 && (
          <div className="mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Pinned Opportunities
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  xl:grid-cols-4 gap-4">
                {Object.entries(pinnedGroupedOpportunities).map(
                  ([symbol, opps]) => (
                    <div key={symbol}>
                      <PinnedTradingPairCard
                        symbol={symbol}
                        opportunities={opps}
                        onPin={() => {}}
                        onUnpin={onUnpin}
                        onUnpinAll={onUnpin}
                        handleDeleteOnExpire={handleDeleteOnExpire}
                        pinnedOpportunities={opps}
                      />
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center mb-4">
              <RefreshCw className="w-4 h-4 mr-1" />
              Last updated: {new Date().toLocaleString()} | Auto-refresh:{" "}
              {refreshConfig?.enabled
                ? isRefetching
                  ? "Refreshing..."
                  : `Every ${refreshConfig.interval / 1000}s`
                : "Disabled"}
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Total: {Object.values(groupedOpportunities).flat().length} (
              {Object.keys(groupedOpportunities).length} Symbols)
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Select
              defaultValue={initialSortBy}
              onValueChange={(value) => onSortChange(value as SortBy)}
            >
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp">Latest First</SelectItem>
                <SelectItem value="volume">By Volume</SelectItem>
                <SelectItem value="spread_asc">Spread (Low to High)</SelectItem>
                <SelectItem value="spread_desc">
                  Spread (High to Low)
                </SelectItem>
              </SelectContent>
            </Select>
            <RefreshButton
              handleRefresh={refetch}
              isRefreshing={isRefetching || isLoading}
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">All Opportunities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 10 }).map((_, index) => (
                  <BaseCardWrapperSkeleton key={index} />
                ))
              : Object.entries(groupedOpportunities).map(([symbol, opps]) => (
                  <div key={symbol} className="break-inside-avoid">
                    <TradingPairCard
                      symbol={symbol}
                      opportunities={opps}
                      onPin={onPin}
                      onUnpin={onUnpin}
                      pinnedOpportunities={pinnedOpportunities.filter(
                        (pinned) => pinned.symbol === symbol,
                      )}
                    />
                  </div>
                ))}
          </div>
        </div>
      </div>
    );
  },
);

export const OpportunityList = memo(OpportunityListComponent);
