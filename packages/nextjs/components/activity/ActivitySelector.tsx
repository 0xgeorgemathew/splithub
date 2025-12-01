"use client";

import Link from "next/link";
import { Activity, getAllActivities } from "~~/config/activities";

interface ActivitySelectorProps {
  activities?: Activity[];
  className?: string;
}

const colorClasses: Record<Activity["color"], string> = {
  red: "border-red-500/30 hover:border-red-500/50 hover:shadow-red-500/20",
  blue: "border-blue-500/30 hover:border-blue-500/50 hover:shadow-blue-500/20",
  cyan: "border-cyan-500/30 hover:border-cyan-500/50 hover:shadow-cyan-500/20",
};

const iconColorClasses: Record<Activity["color"], string> = {
  red: "text-red-400",
  blue: "text-blue-400",
  cyan: "text-cyan-400",
};

export function ActivitySelector({ activities = getAllActivities(), className = "" }: ActivitySelectorProps) {
  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {activities.map(activity => {
        const Icon = activity.icon;
        return (
          <Link
            key={activity.id}
            href={`/activity/${activity.id}`}
            className={`
              bg-base-100/80 backdrop-blur-sm rounded-xl p-4 text-center
              border transition-all duration-200
              hover:shadow-lg hover:-translate-y-0.5
              ${colorClasses[activity.color]}
            `}
          >
            <div
              className={`
              w-10 h-10 mx-auto mb-2 rounded-full
              bg-base-300/50 flex items-center justify-center
              ${iconColorClasses[activity.color]}
            `}
            >
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-base-content mb-0.5">{activity.name}</p>
            <p className="text-[10px] text-primary font-bold">{activity.credits} CR</p>
          </Link>
        );
      })}
    </div>
  );
}
