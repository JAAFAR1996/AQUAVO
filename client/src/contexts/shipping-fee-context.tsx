import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { customerShippingFee, DEFAULT_CUSTOMER_SHIPPING_FEE_IQD } from "@shared/store-policy";

export const DEFAULT_SHIPPING_FEE_IQD = DEFAULT_CUSTOMER_SHIPPING_FEE_IQD;

const ShippingFeeContext = createContext<number>(DEFAULT_SHIPPING_FEE_IQD);

const normalizeShippingFee = customerShippingFee;

export function ShippingFeeProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery<{ shippingFee: number }>({
    queryKey: ["/api/settings/shipping"],
    queryFn: async () => {
      const response = await fetch("/api/settings/shipping", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to load shipping fee");
      return response.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    retry: 1,
  });

  return (
    <ShippingFeeContext.Provider value={normalizeShippingFee(data?.shippingFee)}>
      {children}
    </ShippingFeeContext.Provider>
  );
}

export function useShippingFee(): number {
  return useContext(ShippingFeeContext);
}

export function formatShippingFeeNumber(fee: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(fee);
}
