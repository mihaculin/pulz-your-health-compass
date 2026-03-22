import { useApp } from "@/contexts/AppContext";

export function useSubscription() {
  const { subscriptionTier, subscriptionStatus } = useApp();

  const isPremium =
    subscriptionStatus === "active" &&
    (subscriptionTier === "premium" || subscriptionTier === "clinic");

  const isClinic =
    subscriptionStatus === "active" && subscriptionTier === "clinic";

  return { isPremium, isClinic, subscriptionTier, subscriptionStatus };
}
