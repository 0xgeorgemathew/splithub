import { Circle, Crosshair, LucideIcon, Wind } from "lucide-react";

export interface Activity {
  id: number;
  name: string;
  slug: string;
  credits: number;
  icon: LucideIcon;
  color: "red" | "blue" | "cyan";
}

export const ACTIVITIES: Record<number, Activity> = {
  1: { id: 1, name: "Laser Tag", slug: "laser-tag", credits: 50, icon: Crosshair, color: "red" },
  2: { id: 2, name: "Bowling", slug: "bowling", credits: 30, icon: Circle, color: "blue" },
  3: { id: 3, name: "Air Hockey", slug: "air-hockey", credits: 20, icon: Wind, color: "cyan" },
} as const;

export const getActivityById = (id: number): Activity | undefined => ACTIVITIES[id];

export const getAllActivities = (): Activity[] => Object.values(ACTIVITIES);
