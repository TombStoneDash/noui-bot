/**
 * Subscription plan definitions and feature gating for noui.bot.
 */

export type PlanId = "free" | "pro" | "scale";

export interface PlanLimits {
  name: string;
  agents: number | "unlimited";
  support: "community" | "priority" | "dedicated";
  customDomains: boolean;
  advancedAnalytics: boolean;
  callsPerMonth: number;
  feeRate: string;
  rpm: number;
  price: string;
  priceCents: number;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    name: "Free",
    agents: 3,
    support: "community",
    customDomains: false,
    advancedAnalytics: false,
    callsPerMonth: 100,
    feeRate: "10%",
    rpm: 60,
    price: "$0",
    priceCents: 0,
  },
  pro: {
    name: "Pro",
    agents: "unlimited",
    support: "priority",
    customDomains: true,
    advancedAnalytics: true,
    callsPerMonth: 10_000,
    feeRate: "8%",
    rpm: 300,
    price: "$29/mo",
    priceCents: 2900,
  },
  scale: {
    name: "Scale",
    agents: "unlimited",
    support: "dedicated",
    customDomains: true,
    advancedAnalytics: true,
    callsPerMonth: 100_000,
    feeRate: "5%",
    rpm: 1_000,
    price: "$99/mo",
    priceCents: 9900,
  },
};

export type ProFeature =
  | "unlimited_agents"
  | "priority_support"
  | "custom_domains"
  | "advanced_analytics";

/**
 * Check if a given plan has access to a specific Pro feature.
 */
export function hasFeature(plan: PlanId, feature: ProFeature): boolean {
  const limits = PLANS[plan];
  if (!limits) return false;

  switch (feature) {
    case "unlimited_agents":
      return limits.agents === "unlimited";
    case "priority_support":
      return limits.support === "priority" || limits.support === "dedicated";
    case "custom_domains":
      return limits.customDomains;
    case "advanced_analytics":
      return limits.advancedAnalytics;
    default:
      return false;
  }
}

/**
 * Check if a plan is at least Pro tier (pro or scale).
 */
export function isPro(plan: string): boolean {
  return plan === "pro" || plan === "scale";
}

/**
 * Get agent limit for a plan. Returns Infinity for unlimited.
 */
export function getAgentLimit(plan: PlanId): number {
  const limits = PLANS[plan];
  if (!limits) return 3;
  return limits.agents === "unlimited" ? Infinity : limits.agents;
}
