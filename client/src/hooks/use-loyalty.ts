/**
 * AQUAVO Loyalty Points Hook
 * ==========================
 * جلب بيانات نظام الولاء من الـ API
 */

import { useQuery } from "@tanstack/react-query";

export interface LoyaltyBalance {
  loyaltyPoints: number;
  loyaltyValueIQD: number;
  cashbackBalance: number;
  cashbackValueIQD: number;
  totalValueIQD: number;
  tier: "bronze" | "silver" | "gold" | "diamond";
  tierInfo: {
    name: string;
    nameEn: string;
    minSpent: number;
    maxSpent: number;
    pointMultiplier: number;
    discountPercent: number;
    color: string;
    icon: string;
    benefits: string[];
  };
  totalSpent: number;
  amountToNextTier: number | null;
  progressPercent: number;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  type: string;
  pointsType: "loyalty" | "cashback";
  amount: number;
  balanceAfter: number;
  orderId: string | null;
  description: string;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface RedeemPreview {
  loyaltyPointsUsed: number;
  cashbackUsed: number;
  totalDiscount: number;
  finalAmount: number;
  rounding: {
    originalAmount: number;
    roundedAmount: number;
    cashbackEarned: number;
  };
  amountToPay: number;
}

/**
 * جلب رصيد النقاط والعضوية
 */
export function useLoyaltyBalance(enabled = true) {
  return useQuery<LoyaltyBalance>({
    queryKey: ["/api/loyalty/balance"],
    queryFn: async () => {
      const res = await fetch("/api/loyalty/balance", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch loyalty balance");
      const data = await res.json();
      return data.data;
    },
    enabled,
    staleTime: 30_000, // Cache for 30s
    refetchOnWindowFocus: true,
  });
}

/**
 * جلب سجل حركات النقاط
 */
export function useLoyaltyHistory(limit = 20, offset = 0, enabled = true) {
  return useQuery<LoyaltyTransaction[]>({
    queryKey: ["/api/loyalty/history", limit, offset],
    queryFn: async () => {
      const res = await fetch(`/api/loyalty/history?limit=${limit}&offset=${offset}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch loyalty history");
      const data = await res.json();
      return data.data;
    },
    enabled,
    staleTime: 10_000,
  });
}

/**
 * معاينة استبدال النقاط قبل الشراء
 */
export async function previewRedeem(
  orderTotal: number,
  usePoints = true,
  useCashback = true,
): Promise<RedeemPreview> {
  const res = await fetch("/api/loyalty/preview-redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ orderTotal, usePoints, useCashback }),
  });
  if (!res.ok) throw new Error("Failed to preview redemption");
  const data = await res.json();
  return data.data;
}
