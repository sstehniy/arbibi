import { ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import BaseCardSkeleton from "./BaseCardSkeleton";

export default function CryptoCardWrapperSkeleton() {
  return (
    <div className="relative w-full">
      <Card className="w-full mb-0 p-1 rounded-md">
        <CardHeader className="p-1">
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" /> {/* Symbol placeholder */}
            <div className="flex-1 flex justify-end gap-1">
              <Skeleton className="h-8 w-12 rounded-full" />{" "}
              <Button variant="ghost" size="sm" className="pointer-events-none">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-1">
          <BaseCardSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}
