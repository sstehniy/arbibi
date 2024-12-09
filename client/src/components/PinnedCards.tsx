// src/components/PinnedCards.tsx
import React from "react";
import { CrossExchangeOpportunity } from "../types";
import { PinnedTradingPairCard } from "./PinnedCard";

interface PinnedCardsProps {
  onUnpin: (opportunity: CrossExchangeOpportunity) => void;
  pinnedGroupedOpportunities: Record<
    string,
    CrossExchangeOpportunity[] & { expired?: boolean }[]
  >;
  handleDeleteOnExpire: (opportunity: CrossExchangeOpportunity) => void;
  onUnpinAll: (opportunities: CrossExchangeOpportunity[]) => void;
}

const PinnedCardsComponent: React.FC<PinnedCardsProps> = ({
  onUnpin,
  pinnedGroupedOpportunities,
  handleDeleteOnExpire,
  onUnpinAll,
}) => {
  if (Object.keys(pinnedGroupedOpportunities).length === 0) {
    return (
      <div className="text-gray-500 text-center">No pinned opportunities</div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(pinnedGroupedOpportunities).map(([symbol, opps]) => (
        <div key={symbol}>
          <PinnedTradingPairCard
            symbol={symbol}
            opportunities={opps}
            onPin={() => {}}
            onUnpin={onUnpin}
            onUnpinAll={onUnpinAll}
            handleDeleteOnExpire={handleDeleteOnExpire}
            pinnedOpportunities={opps}
          />
        </div>
      ))}
    </div>
  );
};

export const PinnedCards = React.memo(PinnedCardsComponent);
