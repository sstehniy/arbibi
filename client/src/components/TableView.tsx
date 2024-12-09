"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PinIcon, PinOffIcon, RefreshCw } from "lucide-react";

import type { CrossExchangeOpportunity } from "../types";
import { formatPrice } from "@/util/formatPrice";
import { cn } from "@/lib/utils";
import { PinnedOpportunity } from "@/App";
import { RefreshConfig, SortBy } from "@/hooks/opportunities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RefreshButton from "./RefreshButton";

interface TableViewProps {
  opportunities: CrossExchangeOpportunity[];
  pinnedOpportunities: PinnedOpportunity[];
  onPin: (
    opportunity: CrossExchangeOpportunity | CrossExchangeOpportunity[],
  ) => void;
  onUnpin: (
    opportunity: CrossExchangeOpportunity | CrossExchangeOpportunity[],
  ) => void;
  refreshConfig: RefreshConfig;
  isRefetching: boolean;
  isLoading: boolean;
  refetch: () => void;
  onSortChange: (value: SortBy) => void;
  initialSortBy: SortBy;
}

export default function TableView({
  opportunities,
  pinnedOpportunities,
  onPin,
  onUnpin,
  refreshConfig,
  isRefetching,
  isLoading,
  refetch,
  onSortChange,
  initialSortBy,
}: TableViewProps) {
  const exchanges = useMemo(() => {
    const exchangeSet = new Set<string>();
    opportunities?.forEach((opp) => {
      exchangeSet.add(opp.buyExchange);
      exchangeSet.add(opp.sellExchange);
    });
    return Array.from(exchangeSet).sort();
  }, [opportunities]);

  const groupedOpportunities = useMemo(() => {
    const groups: Record<string, Record<string, CrossExchangeOpportunity>> = {};
    opportunities?.forEach((opp) => {
      if (!groups[opp.symbol]) {
        groups[opp.symbol] = {};
      }
      groups[opp.symbol][`${opp.buyExchange}-${opp.sellExchange}`] = opp;
    });
    return groups;
  }, [opportunities]);

  const maxSpreadPercentages = useMemo(() => {
    const maxSpreads: Record<
      string,
      { spread: number; buy: string; sell: string }
    > = {};
    Object.entries(groupedOpportunities).forEach(([symbol, opps]) => {
      const maxSpread = Math.max(
        ...Object.values(opps).map((opp) => opp.profitPercentage),
      );
      maxSpreads[symbol] = {
        spread: maxSpread,
        buy: formatPrice(
          Math.min(
            ...Object.values(opps).map((opp) => Number(opp.buyPrice)),
          ).toString(),
        ),
        sell: formatPrice(
          Math.max(
            ...Object.values(opps).map((opp) => Number(opp.sellPrice)),
          ).toString(),
        ),
      };
    });
    return maxSpreads;
  }, [groupedOpportunities]);

  const pinnedSymbols = useMemo(() => {
    return new Set(pinnedOpportunities.map((opp) => opp.symbol));
  }, [pinnedOpportunities]);

  const renderTableContent = (
    opportunities: Record<string, Record<string, CrossExchangeOpportunity>>,
    isPinned: boolean,
  ) => (
    <TableBody>
      {Object.entries(opportunities).map(([symbol, opps]) => {
        const maxSpread = maxSpreadPercentages[symbol].spread.toFixed(2);
        const isPinnedSymbol = pinnedSymbols.has(symbol);
        if (isPinned !== isPinnedSymbol) return null;

        return (
          <TableRow
            key={symbol}
            className="hover:bg-gray-50 transition-colors duration-150 ease-in-out"
          >
            <TableCell className="font-medium">{symbol}</TableCell>
            <TableCell>
              <div className="flex items-center space-x-1">
                <span
                  className={cn(
                    "font-semibold",
                    Number(maxSpread) > 5
                      ? "text-green-600"
                      : Number(maxSpread) > 2
                        ? "text-yellow-600"
                        : "text-red-600",
                  )}
                >
                  {maxSpread}%
                </span>
              </div>
            </TableCell>
            {exchanges.map((exchange) => {
              const buyOpportunity = Object.values(opps).find(
                (opp) => opp.buyExchange === exchange,
              );
              const buyPrice = buyOpportunity
                ? formatPrice(buyOpportunity.buyPrice)
                : "-";
              const sellOpportunity = Object.values(opps).find(
                (opp) => opp.sellExchange === exchange,
              );
              const sellPrice = sellOpportunity
                ? formatPrice(sellOpportunity.sellPrice)
                : "-";
              const isMinBuy =
                Math.min(
                  ...Object.values(opps).map((opp) => Number(opp.buyPrice)),
                ) === Number(buyPrice);
              const isMaxSell =
                Math.max(
                  ...Object.values(opps).map((opp) => Number(opp.sellPrice)),
                ) === Number(sellPrice);
              return (
                <TableCell
                  key={exchange}
                  className={cn(
                    "font-mono",
                    isMinBuy
                      ? "text-green-600 font-semibold"
                      : isMaxSell
                        ? "text-red-600 font-semibold"
                        : "text-gray-600",
                  )}
                >
                  {Object.values(opps).find(
                    (opp) =>
                      opp.buyExchange === exchange ||
                      opp.sellExchange === exchange,
                  )?.buyExchange === exchange
                    ? buyPrice
                    : sellPrice}
                </TableCell>
              );
            })}
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const opportunitiesToToggle = Object.values(opps);
                  if (isPinned) {
                    onUnpin(opportunitiesToToggle);
                  } else {
                    onPin(opportunitiesToToggle);
                  }
                }}
              >
                {isPinned ? (
                  <PinOffIcon className="h-4 w-4" />
                ) : (
                  <PinIcon className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {isPinned ? "Unpin" : "Pin"} {symbol}
                </span>
              </Button>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );

  const renderTable = (isPinned: boolean) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm mb-8">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="font-bold text-gray-900">Symbol</TableHead>
            <TableHead className="font-bold text-gray-900">
              <div className="flex items-center space-x-1">
                <span>Max %</span>
              </div>
            </TableHead>
            {exchanges.map((exchange) => (
              <TableHead key={exchange} className="font-bold text-gray-900">
                {exchange}
              </TableHead>
            ))}
            <TableHead className="font-bold text-gray-900">Actions</TableHead>
          </TableRow>
        </TableHeader>
        {renderTableContent(groupedOpportunities, isPinned)}
      </Table>
    </div>
  );

  return (
    <div>
      {pinnedOpportunities.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mb-4">Pinned Opportunities</h2>
          {renderTable(true)}
        </>
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
              <SelectItem value="spread_desc">Spread (High to Low)</SelectItem>
            </SelectContent>
          </Select>
          <RefreshButton
            handleRefresh={refetch}
            isRefreshing={isRefetching || isLoading}
          />
        </div>
      </div>
      {renderTable(false)}
    </div>
  );
}
