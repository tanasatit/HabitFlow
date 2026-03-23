export interface User {
  id: string;
  email: string;
  name: string;
  role: "free" | "pro" | "admin";
  createdAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  description: string;
  frequency: "daily" | "weekly";
  targetDays: number[];
  streak: number;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  completedAt: string;
  note?: string;
}

export interface AICoachResponse {
  plan: HabitPlan[];
  summary: string;
}

export interface HabitPlan {
  title: string;
  description: string;
  frequency: "daily" | "weekly";
  targetDays: number[];
  rationale: string;
}
