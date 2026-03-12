// SINGLE SOURCE OF TRUTH - simplified types

export type Category = "physical" | "mental" | "spiritual" | "social" | "creative" | "health";

export type TaskType = "habit" | "daily" | "todo";

// Main Task interface - the core data unit
export interface Task {
  id: string;
  title: string;
  category: string;
  type: TaskType;
  reward: number;
  createdAt: Date;
  count: number;
  completed: boolean;
  history: { date: Date; credits: number }[];
}

export interface Reward {
  id: string;
  name: string;
  icon: string;
  cost: number;
  createdAt: Date;
}

export interface SpendLog {
  id: string;
  rewardId: string;
  date: Date;
  creditsSpent: number;
}

export interface UserStats {
  balance: number;
  currentStreak: number;
  longestStreak: number;
  totalEarned: number;
  totalSpent: number;
}

// Legacy exports for backwards compatibility (if needed)
export type Activity = Task;
export type ActivityLog = { id: string; activityId: string; date: Date; creditsEarned: number };
