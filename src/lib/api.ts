// API Client with error handling and type safety

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

interface APIResponse<T> {
  data: T | null;
  error: string | null;
}

async function handleResponse<T>(response: Response): Promise<APIResponse<T>> {
  const data = await response.json();

  if (!response.ok) {
    return {
      data: null,
      error: data.error || "Something went wrong",
    };
  }

  return { data, error: null };
}

// Auth API
export const authAPI = {
  async login(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ success: boolean; user: AuthUser }>(res);
  },

  async register(name: string, email: string, password: string) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse<{ success: boolean; user: AuthUser }>(res);
  },

  async logout() {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    return handleResponse<{ success: boolean }>(res);
  },

  async me() {
    const res = await fetch("/api/auth/me");
    return handleResponse<{ user: AuthUser }>(res);
  },
};

// Sync API
export const syncAPI = {
  async getAll() {
    const res = await fetch("/api/sync");
    return handleResponse<SyncData>(res);
  },
};

// Tasks API
export const tasksAPI = {
  async create(task: CreateTaskInput) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    return handleResponse<{ task: Task }>(res);
  },

  async delete(id: string) {
    const res = await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    return handleResponse<{ success: boolean }>(res);
  },

  async increment(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "increment" }),
    });
    return handleResponse<TaskActionResponse>(res);
  },

  async decrement(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decrement" }),
    });
    return handleResponse<TaskActionResponse>(res);
  },

  async toggle(id: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle" }),
    });
    return handleResponse<TaskActionResponse>(res);
  },

  async update(id: string, data: UpdateTaskInput) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; task: Task }>(res);
  },

  async deleteById(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    return handleResponse<{ success: boolean }>(res);
  },
};

// Rewards API
export const rewardsAPI = {
  async create(reward: CreateRewardInput) {
    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reward),
    });
    return handleResponse<{ reward: Reward }>(res);
  },

  async delete(id: string) {
    const res = await fetch(`/api/rewards?id=${id}`, { method: "DELETE" });
    return handleResponse<{ success: boolean }>(res);
  },

  async spend(id: string) {
    const res = await fetch(`/api/rewards/${id}/spend`, { method: "POST" });
    return handleResponse<SpendResponse>(res);
  },

  async update(id: string, data: UpdateRewardInput) {
    const res = await fetch(`/api/rewards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; reward: Reward }>(res);
  },

  async archive(id: string) {
    const res = await fetch(`/api/rewards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    return handleResponse<{ success: boolean; reward: Reward }>(res);
  },
};

// Types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: string;
  balance: number;
  currentStreak: number;
  longestStreak: number;
  totalEarned: number;
  totalSpent: number;
}

export interface Task {
  id: string;
  title: string;
  category: string;
  type: "habit" | "daily" | "todo";
  reward: number;
  count: number;
  completed: boolean;
  archived?: boolean;
  createdAt: string;
  history: { date: string; credits: number }[];
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  icon: string;
  cost: number;
  archived?: boolean;
  createdAt: string;
}

export interface SpendLog {
  id: string;
  rewardId: string;
  date: string;
  creditsSpent: number;
}

export interface UserStats {
  balance: number;
  currentStreak: number;
  longestStreak: number;
  totalEarned: number;
  totalSpent: number;
}

export interface SyncData {
  tasks: Task[];
  rewards: Reward[];
  spendLogs: SpendLog[];
  stats: UserStats;
}

export interface CreateTaskInput {
  title: string;
  category: string;
  type: "habit" | "daily" | "todo";
  reward: number;
}

export interface CreateRewardInput {
  name: string;
  icon?: string;
  cost: number;
  description?: string;
}

export interface TaskActionResponse {
  success: boolean;
  credits: number;
  action: "earned" | "removed";
  completed?: boolean;
}

export interface SpendResponse {
  success: boolean;
  spendLog: SpendLog;
  stats: {
    balance: number;
    totalSpent: number;
  };
}

export interface UpdateTaskInput {
  title?: string;
  category?: string;
  reward?: number;
}

export interface UpdateRewardInput {
  name?: string;
  cost?: number;
  description?: string;
  icon?: string;
  archived?: boolean;
}
