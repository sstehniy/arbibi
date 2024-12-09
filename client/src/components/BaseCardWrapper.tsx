import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Pin, PinOff } from "lucide-react";
import type { ReactNode } from "react";

type BaseCardWrapperProps = {
  symbol: string;
  opportunitiesCount: number;
  children: ReactNode;
  onPinAll?: () => void;
  onUnpinAll?: () => void;
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
};
export const BaseCardWrapper = ({
  symbol,
  opportunitiesCount,
  children,
  onPinAll,
  onUnpinAll,
  isExpanded,
  setIsExpanded,
}: BaseCardWrapperProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && !!(onPinAll || onUnpinAll) && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-5 -left-3 z-10 hover:bg-orange-400 bg-orange-400 shadow-md text-white hover:text-white"
          onClick={() => (onUnpinAll ? onUnpinAll() : onPinAll?.())}
        >
          {onUnpinAll ? (
            <PinOff className="h-4 w-4" />
          ) : (
            <Pin className="h-4 w-4" />
          )}
        </Button>
      )}
      <Card className="w-full mb-0 p-1 rounded-md">
        <CardHeader className="p-1">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl font-bold">{symbol}</span>
            <div className="flex-1 flex justify-end gap-1">
              <Badge variant="secondary" className="text-md py-2 font-bold">
                <span>{opportunitiesCount}</span>
              </Badge>
              {opportunitiesCount > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-1">{children}</CardContent>
      </Card>
    </div>
  );
};
