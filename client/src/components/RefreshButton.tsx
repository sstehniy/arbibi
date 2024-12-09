import { Button } from "@/components/ui/button";

import { RefreshCw } from "lucide-react";

export default function RefreshButton({
  handleRefresh,
  isRefreshing,
}: {
  handleRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <Button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center space-x-2"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
    </Button>
  );
}
