import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export default function BaseCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 divide-x">
          <div className="p-4 bg-green-50 dark:bg-green-900/20">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="px-4 py-2 bg-muted flex justify-between items-center">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="px-4 py-3 bg-background">
          <Skeleton className="h-5 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
