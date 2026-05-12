/**
 * AQUAVO Loyalty Points Hook
 * ==========================
 * جلب بيانات نظام الولاء من الـ API
 */

import { useQuery } from "@tanstack/react-query";
import { addCsrfHeader } from "@/lib/csrf";

export interface LoyaltyBalance {
  loyaltyPoints: number;
  pendingLoyaltyPoints: number;
  loyaltyValueIQD: number;
  cashbackBalance: number;
  pendingCashbackBalance: number;
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
  welcomeBonusClaimed: boolean;
  aquariumProfile: {
    tankSize?: string;
    fishType?: string;
    mainProblem?: string;
    tankAge?: string;
  } | null;
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
  status: "pending" | "approved" | "rejected" | "cancelled";
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
 * حفظ ملف الحوض (Aquarium Profile Quiz)
 */
export async function saveAquariumProfile(
  profile: { tankSize: string; fishType: string; mainProblem: string; tankAge: string },
): Promise<{ points: number; alreadyCompleted: boolean }> {
  const res = await fetch("/api/loyalty/aquarium-profile", {
    method: "POST",
    headers: addCsrfHeader({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error("Failed to save aquarium profile");
  const data = await res.json();
  return data.data;
}

/**
 * جلب مكافأة طلب (Bonus Reveal)
 */
export function useOrderBonus(orderId: string | null) {
  return useQuery<{
    prize: { type: string; value: number; label: string } | null;
    status: "pending" | "revealed" | "none";
    orderStatus: string;
  }>({
    queryKey: ["/api/loyalty/orders", orderId, "bonus"],
    queryFn: async () => {
      const res = await fetch(`/api/loyalty/orders/${orderId}/bonus`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch order bonus");
      const data = await res.json();
      return data.data;
    },
    enabled: !!orderId,
    staleTime: 60_000,
  });
}

/**
 * جلب معالم التقدم (Milestone Alerts)
 */
export function useMilestones(enabled = true) {
  return useQuery<{
    milestones: Array<{ type: string; message: string; tier?: string }>;
    tierChanged: boolean;
    newTier?: string;
  }>({
    queryKey: ["/api/loyalty/milestones"],
    queryFn: async () => {
      const res = await fetch("/api/loyalty/milestones", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch milestones");
      const data = await res.json();
      return data.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

/**
 * جلب شارات المستخدم
 */
export function useBadges(enabled = true) {
  return useQuery<Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    icon: string;
    pointsReward: number | null;
    criteria: { type: string; target: number };
    sortOrder: number | null;
    earned: boolean;
    earnedAt: string | null;
  }>>({
    queryKey: ["/api/loyalty/badges"],
    queryFn: async () => {
      const res = await fetch("/api/loyalty/badges", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch badges");
      const data = await res.json();
      return data.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

/**
 * جلب تحديات الشهر
 */
export function useChallenges(enabled = true) {
  return useQuery<Array<{
    id: string;
    month: string;
    title: string;
    description: string | null;
    type: string;
    target: number;
    rewardPoints: number;
    progress: number;
    completed: boolean;
    pointsAwarded: boolean;
  }>>({
    queryKey: ["/api/loyalty/challenges"],
    queryFn: async () => {
      const res = await fetch("/api/loyalty/challenges", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch challenges");
      const data = await res.json();
      return data.data;
    },
    enabled,
    staleTime: 30_000,
  });
}

/**
 * فحص مكافأة الرجوع (winback)
 */
export function useWinback(enabled = true) {
  return useQuery<{
    type: "points" | "discount" | "none";
    value?: number;
    couponId?: string;
    message?: string;
  }>({
    queryKey: ["/api/loyalty/winback"],
    queryFn: async () => {
      const res = await fetch("/api/loyalty/winback", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to check winback");
      const data = await res.json();
      return data.data;
    },
    enabled,
    staleTime: 300_000, // 5 min — not needed frequently
  });
}

/**
 * توصيات مخصصة بناءً على ملف الحوض
 */
export function useRecommendations(enabled = true) {
  return useQuery<Array<{
    category: string;
    label: string;
    reason: string;
  }>>({
    queryKey: ["/api/loyalty/recommendations"],
    queryFn: async () => {
      const res = await fetch("/api/loyalty/recommendations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      const data = await res.json();
      return data.data;
    },
    enabled,
    staleTime: 120_000,
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
    headers: addCsrfHeader({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ orderTotal, usePoints, useCashback }),
  });
  if (!res.ok) throw new Error("Failed to preview redemption");
  const data = await res.json();
  return data.data;
}
