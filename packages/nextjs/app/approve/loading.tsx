/**
 * Next.js loading.tsx - shown during page transitions to /approve
 *
 * IMPORTANT: This file is deliberately minimal/invisible to prevent flashing
 * loading states during onboarding flow. The page component itself handles
 * loading states appropriately based on context (direct navigation vs onboarding).
 */
export default function ApproveLoading() {
  // Return minimal invisible element to prevent flash during navigation
  // The actual page will handle loading states appropriately
  return <div className="min-h-[calc(100vh-64px)] bg-base-300" />;
}
