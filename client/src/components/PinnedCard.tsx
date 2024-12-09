import React, { useState } from "react";
import { CrossExchangeOpportunity } from "@/types";
import { useOpportunity } from "@/hooks/opportunities";
import { BaseCard } from "./BaseCard";
import { BaseCardWrapper } from "./BaseCardWrapper";

type PinnedTradingPairCardProps = {
  symbol: string;
  opportunities: CrossExchangeOpportunity[];
  onPin: (opportunity: CrossExchangeOpportunity) => void;
  onUnpin: (opportunity: CrossExchangeOpportunity) => void;
  handleDeleteOnExpire: (opportunity: CrossExchangeOpportunity) => void;
  pinnedOpportunities: CrossExchangeOpportunity[];
  onUnpinAll: (opportunities: CrossExchangeOpportunity[]) => void;
};

const PinnedTradingPairCardComponent: React.FC<PinnedTradingPairCardProps> = ({
  symbol,
  opportunities = [],
  onPin,
  onUnpin,
  pinnedOpportunities,
  handleDeleteOnExpire,
  onUnpinAll,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <BaseCardWrapper
      symbol={symbol}
      opportunitiesCount={opportunities?.length || 0}
      onUnpinAll={() => onUnpinAll(opportunities)}
      isExpanded={isExpanded}
      setIsExpanded={setIsExpanded}
    >
      {!isExpanded
        ? opportunities
            .slice(0, 1)
            .map((opp) => (
              <LiveTickerData
                key={opp.buyExchange + opp.sellExchange + opp.symbol}
                opp={opp}
                pinned={pinnedOpportunities.includes(opp)}
                onPin={onPin}
                onUnpin={onUnpin}
                handleDeleteOnExpire={handleDeleteOnExpire}
              />
            ))
        : opportunities.map((opp) => (
            <LiveTickerData
              key={opp.buyExchange + opp.sellExchange + opp.symbol}
              opp={opp}
              pinned={pinnedOpportunities.includes(opp)}
              onPin={onPin}
              onUnpin={onUnpin}
              handleDeleteOnExpire={handleDeleteOnExpire}
            />
          ))}
    </BaseCardWrapper>
  );
};

export const PinnedTradingPairCard = React.memo(PinnedTradingPairCardComponent);

const LiveTickerData = ({
  opp: initialOpp,
  pinned,
  onPin,
  onUnpin,
  handleDeleteOnExpire,
  className,
}: {
  opp: CrossExchangeOpportunity;
  pinned: boolean;
  onPin: (opportunity: CrossExchangeOpportunity) => void;
  onUnpin: (opportunity: CrossExchangeOpportunity) => void;
  handleDeleteOnExpire: (opportunity: CrossExchangeOpportunity) => void;
  className?: string;
}) => {
  const { data: opp } = useOpportunity(initialOpp);

  return (
    <BaseCard
      opportunity={opp}
      isPinned={pinned}
      onPin={() => onPin(opp)}
      onUnpin={() => onUnpin(opp)}
      onDelete={() => handleDeleteOnExpire(opp)}
      className={className}
      showFetchNetworkAndFee
    />
  );
};
