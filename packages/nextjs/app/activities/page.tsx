"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getAllActivities } from "~~/config/activities";
import { useCreditBalance } from "~~/hooks/credits";

export default function ActivitiesPage() {
  const activities = getAllActivities();
  const { formattedBalance } = useCreditBalance();

  return (
    <div className="activities-list-container">
      {/* Back button */}
      <Link
        href="/credits"
        className="inline-flex items-center gap-2 mb-6 text-[#22c55e] opacity-60 hover:opacity-100 transition-opacity"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-mono text-xs tracking-wider">BACK TO TERMINAL</span>
      </Link>

      {/* Header */}
      <div className="activities-list-header">
        <div className="activities-list-title">ACTIVITY ZONE</div>
        <div className="activities-list-subtitle">SELECT AN ACTIVITY</div>
      </div>

      {/* Balance display */}
      <div className="activity-balance-display mb-6">
        <span className="activity-balance-label">BALANCE</span>
        <span className="activity-balance-value">{formattedBalance.toFixed(0)} CR</span>
      </div>

      {/* Activity list */}
      <div>
        {activities.map(activity => {
          const Icon = activity.icon;
          const canAfford = formattedBalance >= activity.credits;

          return (
            <Link
              key={activity.id}
              href={`/activity/${activity.id}`}
              className={`activity-card ${!canAfford ? "opacity-50" : ""}`}
            >
              <div className="activity-card-content">
                <div className="activity-card-icon">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="activity-card-info">
                  <div className="activity-card-name">{activity.name}</div>
                  <div className="activity-card-cost">{activity.credits} CREDITS</div>
                </div>
                <ChevronRight className="w-5 h-5 activity-card-arrow" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
