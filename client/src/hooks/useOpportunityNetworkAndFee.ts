import { API_URL } from "@/main";
import { useQuery } from "@tanstack/react-query";

export type OpportunityNetworkAndFee = {
  network: string | null;
  withdrawalFee: number | null;
  depositEnabled: boolean | null;
};

async function fetchOpportunityNetworkAndFee(
  coinToWithdraw: string,
  buyExchange: string,
  sellExchange: string,
): Promise<
  | {
      network: string | null;
      withdrawalFee: number | null;
      depositEnabled: boolean | null;
    }[]
  | null
> {
  const data = await fetch(
    `${API_URL}/opportunity-network-and-fee?coinToWithdraw=${coinToWithdraw}&buyExchange=${buyExchange}&sellExchange=${sellExchange}`,
  );
  if (!data.ok) {
    throw new Error("Failed to fetch opportunity network and fee");
  }
  return data.json();
}

export const useOpportunityNetworkAndFee = (
  coinToWithdraw: string,
  buyExchange: string,
  sellExchange: string,
) => {
  const query = useQuery<
    | {
        network: string | null;
        withdrawalFee: number | null;
        depositEnabled: boolean | null;
      }[]
    | null
  >({
    queryKey: [
      "opportunity-network-and-fee",
      coinToWithdraw,
      buyExchange,
      sellExchange,
    ],
    queryFn: () =>
      fetchOpportunityNetworkAndFee(coinToWithdraw, buyExchange, sellExchange),
    staleTime: 0,
    enabled: false,
    initialData: [],
  });

  return [query.refetch, query] as const;
};
