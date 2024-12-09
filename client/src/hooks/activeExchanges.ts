import { API_URL } from "@/main";
import { useQuery } from "@tanstack/react-query";

async function fetchActiveExchanges() {
  const data = await fetch(`${API_URL}/active-exchanges`);
  if (!data.ok) {
    throw new Error("Failed to fetch opportunity");
  }
  return data.json();
}

export function useActiveExchanges() {
  return useQuery<string[], Error>({
    queryKey: ["active-exchanges"],
    queryFn: fetchActiveExchanges,
    staleTime: 1000 * 60 * 5,
  });
}
