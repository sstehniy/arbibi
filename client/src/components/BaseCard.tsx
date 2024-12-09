"use client";

import { useState } from "react";
import { CrossExchangeOpportunity } from "@/types";
import { getPriceFontSize } from "@/util/getPriceFontSize";
import {
  ArrowRightLeft,
  TrendingUp,
  PinOff,
  Pin,
  Trash,
  DollarSign,
  Network,
  Wallet,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPrice } from "@/util/formatPrice";
import { useOpportunityNetworkAndFee } from "@/hooks/useOpportunityNetworkAndFee";

type BaseCardProps = {
  opportunity: CrossExchangeOpportunity;
  isPinned: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  onDelete?: () => void;
  highlighted?: boolean;
  className?: string;
  showFetchNetworkAndFee?: boolean;
};

const NetworkAndFeeInfo = ({
  opportunity,
  showFetchNetworkAndFee,
}: {
  opportunity: CrossExchangeOpportunity;
  showFetchNetworkAndFee: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fetchNetworkAndFee, { data: networkAndFees, isFetching }] =
    useOpportunityNetworkAndFee(
      opportunity.symbol.split("/")[0],
      opportunity.buyExchange,
      opportunity.sellExchange,
    );

  if (!showFetchNetworkAndFee) return null;

  const handleRefresh = () => {
    fetchNetworkAndFee();
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="networks" className="border-b-0">
        <AccordionTrigger
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (!isExpanded && !networkAndFees) fetchNetworkAndFee();
          }}
          className="py-2 hover:no-underline"
        >
          <span className="text-sm font-medium">Network & Fee Information</span>
        </AccordionTrigger>
        <AccordionContent>
          {isFetching ? (
            <div className="space-y-2 mt-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : networkAndFees && networkAndFees.length > 0 ? (
            <div className="space-y-2 mt-2">
              {networkAndFees.map(
                ({ network, withdrawalFee, depositEnabled }) => (
                  <div
                    key={network}
                    className="bg-muted p-2 rounded-md flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Network className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-sm font-medium">{network}</span>
                      {depositEnabled !== null && (
                        <Badge
                          variant={depositEnabled ? "outline" : "destructive"}
                          className={`ml-2 text-xs px-2 py-0.5 ${
                            depositEnabled
                              ? "bg-green-100 text-green-800 border-green-300"
                              : "bg-red-100 text-red-800 border-red-300"
                          }`}
                        >
                          {depositEnabled === true
                            ? "Deposits ✓"
                            : depositEnabled === false
                              ? "Deposits ✗"
                              : "Deposits N/A"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center">
                      <Wallet className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">
                        {withdrawalFee} {opportunity.symbol.split("/")[0]}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-4 h-4 ml-1 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              This is the withdrawal fee for transferring assets
                              from the exchange.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="w-full mt-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Networks & Fees
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNetworkAndFee()}
              className="w-full mt-2"
            >
              Fetch Network & Fee
            </Button>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export const BaseCard: React.FC<BaseCardProps> = ({
  opportunity,
  isPinned,
  onPin,
  onUnpin,
  onDelete,
  highlighted,
  className,
  showFetchNetworkAndFee = false,
}) => {
  const buyPrice = formatPrice(opportunity.buyPrice);
  const sellPrice = formatPrice(opportunity.sellPrice);
  const spread = opportunity.profitPercentage.toFixed(2);

  return (
    <Card
      className={`overflow-hidden relative ${highlighted ? "ring-2 ring-orange-500 mx-1" : ""} ${className}`}
    >
      {opportunity.expired && (
        <Badge
          variant="destructive"
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 pt-1.5"
        >
          Expired
        </Badge>
      )}
      <CardContent className={`p-0 ${opportunity.expired ? "opacity-50" : ""}`}>
        <div className="grid grid-cols-2 divide-x">
          <div className="p-4 bg-green-50 dark:bg-green-900/20">
            <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Buy: {opportunity.buyExchange.toUpperCase()}
            </h3>
            <p
              className={`${getPriceFontSize(buyPrice)} font-bold text-green-600 dark:text-green-400`}
            >
              ${buyPrice}
            </p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20">
            <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Sell: {opportunity.sellExchange.toUpperCase()}
            </h3>
            <p
              className={`${getPriceFontSize(sellPrice)} font-bold text-red-600 dark:text-red-400`}
            >
              ${sellPrice}
            </p>
          </div>
        </div>
        <div className="px-4 py-2 bg-muted flex justify-between items-center">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Profit: {spread}%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {(onPin || onUnpin) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (isPinned ? onUnpin?.() : onPin?.())}
                disabled={opportunity.expired}
              >
                {isPinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
            )}
            {onDelete && opportunity.expired && (
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="px-4 py-3 bg-background space-y-2">
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Min Volume 24h (USD):{" "}
              {opportunity.minVolume
                .toFixed(0)
                .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
            </span>
          </div>
          <NetworkAndFeeInfo
            opportunity={opportunity}
            showFetchNetworkAndFee={showFetchNetworkAndFee}
          />
        </div>
      </CardContent>
    </Card>
  );
};
