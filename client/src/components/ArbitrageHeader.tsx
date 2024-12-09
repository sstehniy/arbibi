import { useState, memo, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { RefreshConfig } from "@/hooks/opportunities";
import { Switch } from "@/components/ui/switch";
import { Minus, Plus } from "lucide-react";
import { Filters } from "@/App";

export const MIN_VOLUME = 10000;
export const MIN_PERCENTAGE = 2;
export const MAX_PERCENTAGE = 100;

interface ArbitrageHeaderProps {
  onFilterChange: (filters: Filters) => void;
  filters: Filters;
  refreshConfig: RefreshConfig;
  handleRefreshConfigChange: (field: keyof RefreshConfig, value: any) => void;

  handleResetFilters: () => void;
}

export const ArbitrageHeader = memo(
  ({
    onFilterChange,
    filters: initialFilters,
    refreshConfig,
    handleRefreshConfigChange,
    handleResetFilters,
  }: ArbitrageHeaderProps) => {
    const [filters, setFilters] = useState<Filters>(initialFilters);
    const [refreshTime, setRefreshTime] = useState<number>(
      refreshConfig.interval,
    );

    useEffect(() => {
      setFilters(initialFilters);
    }, [initialFilters]);

    const handleFilterChange = useCallback(
      (key: keyof Filters, value: (typeof filters)[typeof key]) => {
        setFilters((prevFilters) => ({
          ...prevFilters,
          [key]: value,
        }));
      },
      [],
    );

    const applyFilters = useCallback(() => {
      onFilterChange(filters);
    }, [filters, onFilterChange]);

    return (
      <div className="space-y-6 w-full border-b pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">
            Arbitrage Opportunities
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-6 lg:space-y-0">
          <div className="flex-1 space-y-6 border-r pr-6 border-gray-200">
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="min-volume">Minimum Volume</Label>
                <Input
                  id="min-volume"
                  type="number"
                  value={filters.minVolume}
                  onChange={(e) =>
                    handleFilterChange("minVolume", parseInt(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-spread">Min Spread (%)</Label>
                <Input
                  id="min-spread"
                  type="number"
                  value={filters.minSpread}
                  onChange={(e) =>
                    handleFilterChange("minSpread", parseFloat(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-spread">Max Spread (%)</Label>
                <Input
                  id="max-spread"
                  type="number"
                  value={filters.maxSpread}
                  onChange={(e) =>
                    handleFilterChange("maxSpread", parseFloat(e.target.value))
                  }
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-refresh"
                  checked={refreshConfig.enabled}
                  onCheckedChange={(checked) =>
                    handleRefreshConfigChange("enabled", checked)
                  }
                />
                <Label htmlFor="auto-refresh">Auto-refresh</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="refresh-interval">Refresh Interval (ms)</Label>
                <Input
                  id="refresh-interval"
                  type="number"
                  min={1000}
                  value={refreshTime}
                  onChange={(e) =>
                    +e.target.value > 999
                      ? setRefreshTime(parseInt(e.target.value))
                      : setRefreshTime(1000)
                  }
                  disabled={!refreshConfig.enabled}
                  className="w-24"
                />
              </div>
              <Button
                onClick={() =>
                  handleRefreshConfigChange("interval", refreshTime)
                }
              >
                Apply
              </Button>
            </div>
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-lg font-semibold">Buy Exchanges</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleFilterChange(
                      "buyExchanges",
                      filters.buyExchanges.map((e) => ({
                        ...e,
                        active: false,
                      })),
                    );
                  }}
                >
                  Uncheck All
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleFilterChange(
                      "buyExchanges",
                      filters.buyExchanges.map((e) => ({
                        ...e,
                        active: true,
                      })),
                    );
                  }}
                >
                  Select All
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {filters.buyExchanges.map((exchange) => (
                  <div
                    key={exchange.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`buy-exchange-${exchange.value}`}
                      checked={exchange.active}
                      onCheckedChange={(checked) => {
                        const updatedExchanges = filters.buyExchanges.map(
                          (e) => ({
                            ...e,
                            active:
                              e.value === exchange.value
                                ? (checked as boolean)
                                : e.active,
                          }),
                        );
                        handleFilterChange("buyExchanges", updatedExchanges);
                      }}
                    />
                    <Label htmlFor={`buy-exchange-${exchange.value}`}>
                      {exchange.value}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-lg font-semibold">Sell Exchanges</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleFilterChange(
                      "sellExchanges",
                      filters.sellExchanges.map((e) => ({
                        ...e,
                        active: false,
                      })),
                    );
                  }}
                >
                  Uncheck All
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleFilterChange(
                      "sellExchanges",
                      filters.sellExchanges.map((e) => ({
                        ...e,
                        active: true,
                      })),
                    );
                  }}
                >
                  Select All
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {filters.sellExchanges.map((exchange) => (
                  <div
                    key={exchange.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`sell-exchange-${exchange.value}`}
                      checked={exchange.active}
                      onCheckedChange={(checked) => {
                        const updatedExchanges = filters.sellExchanges.map(
                          (e) => ({
                            ...e,
                            active:
                              e.value === exchange.value
                                ? (checked as boolean)
                                : e.active,
                          }),
                        );
                        handleFilterChange("sellExchanges", updatedExchanges);
                      }}
                    />
                    <Label htmlFor={`sell-exchange-${exchange.value}`}>
                      {exchange.value}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={handleResetFilters}>
            Clear Filters
          </Button>
          <Button onClick={applyFilters}>Apply Filters</Button>
        </div>
      </div>
    );
  },
);

ArbitrageHeader.displayName = "ArbitrageHeader";
