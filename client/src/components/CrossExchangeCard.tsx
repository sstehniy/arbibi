import { useCallback, useState, useRef, useEffect, memo } from "react";
import { CrossExchangeOpportunity } from "@/types";
import { BaseCard } from "./BaseCard";
import { BaseCardWrapper } from "./BaseCardWrapper";

type TradingPairCardProps = {
  symbol: string;
  opportunities: CrossExchangeOpportunity[];
  onPin: (
    opportunity: CrossExchangeOpportunity | CrossExchangeOpportunity[],
  ) => void;
  onUnpin: (
    opportunity: CrossExchangeOpportunity | CrossExchangeOpportunity[],
  ) => void;
  pinnedOpportunities: CrossExchangeOpportunity[];
};

function TradingPairCardComponent({
  symbol,
  opportunities = [],
  onPin,
  onUnpin,
  pinnedOpportunities,
}: TradingPairCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState("auto");
  const contentRef = useRef<HTMLDivElement>(null);

  const isOpportunityPinned = useCallback(
    (opp: CrossExchangeOpportunity) =>
      pinnedOpportunities.some(
        (pinned) =>
          pinned.symbol === opp.symbol &&
          pinned.buyExchange === opp.buyExchange &&
          pinned.sellExchange === opp.sellExchange,
      ),
    [pinnedOpportunities],
  );
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (contentRef.current) {
        const height = isExpanded
          ? `${contentRef.current.scrollHeight}px`
          : `${contentRef.current.children[0]?.clientHeight + 8 || 0}px`;
        setContentHeight(height);
      }
    });

    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => {
      if (contentRef.current) {
        observer.unobserve(contentRef.current);
      }
    };
  }, [isExpanded, opportunities]);

  return (
    <BaseCardWrapper
      symbol={symbol}
      opportunitiesCount={opportunities?.length || 0}
      onPinAll={() => onPin(opportunities)}
      isExpanded={isExpanded}
      setIsExpanded={setIsExpanded}
    >
      <div
        ref={contentRef}
        className="transition-[height] duration-300 ease-in-out overflow-hidden space-y-3 py-1"
        style={{ height: contentHeight }}
      >
        {opportunities.map((opportunity, index) => {
          const oppId = `${opportunity.buyExchange}-${opportunity.sellExchange}-${opportunity.timestamp}`;
          const pinned = isOpportunityPinned(opportunity);

          return (
            <BaseCard
              key={oppId}
              opportunity={opportunity}
              isPinned={pinned}
              onPin={() => onPin(opportunity)}
              onUnpin={() => onUnpin(opportunity)}
              highlighted={pinned}
              className={index !== 0 && !isExpanded ? "hidden" : ""}
            />
          );
        })}
      </div>
    </BaseCardWrapper>
  );
}

TradingPairCardComponent.displayName = "TradingPairCardComponent";

export const TradingPairCard = memo(TradingPairCardComponent);
