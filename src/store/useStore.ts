import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateId, isToday } from "@/lib/utils";
import { tasksAPI, rewardsAPI, syncAPI, Task as APITask, Reward as APIReward, SpendLog as APISpendLog, UpdateTaskInput, UpdateRewardInput } from "@/lib/api";
import { useAuthStore } from "./authStore";

// SINGLE SOURCE OF TRUTH - One Task type for everything
export interface Task {
  id: string;
  title: string;
  category: string;
  type: "habit" | "daily" | "todo";
  reward: number;
  createdAt: Date;
  count: number;
  completed: boolean;
  archived?: boolean;
  history: { date: Date; credits: number }[];
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  icon: string;
  cost: number;
  archived?: boolean;
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

interface AppState {
  // SINGLE SOURCE OF TRUTH
  tasks: Task[];
  rewards: Reward[];
  spendLogs: SpendLog[];
  stats: UserStats;

  // Sync state
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;

  // Sync Actions
  syncFromServer: () => Promise<void>;

  // Task Actions
  addTask: (task: Omit<Task, "id" | "createdAt" | "count" | "completed" | "history">) => Promise<void>;
  updateTask: (id: string, data: UpdateTaskInput) => Promise<boolean>;
  deleteTask: (id: string) => Promise<void>;

  // Habit Actions
  incrementTask: (id: string) => Promise<{ success: boolean; credits?: number }>;
  decrementTask: (id: string) => Promise<{ success: boolean; credits?: number }>;

  // Daily/Todo Actions
  toggleTask: (id: string) => Promise<{ success: boolean; credits?: number; completed?: boolean }>;
  resetDailies: () => void;

  // Reward Actions
  addReward: (reward: Omit<Reward, "id" | "createdAt">) => Promise<void>;
  updateReward: (id: string, data: UpdateRewardInput) => Promise<boolean>;
  archiveReward: (id: string) => Promise<boolean>;
  deleteReward: (id: string) => Promise<void>;
  spendOnReward: (rewardId: string) => Promise<boolean>;

  // Derived Data (computed from tasks)
  getHabits: () => Task[];
  getDailies: () => Task[];
  getTodos: () => Task[];
  getActiveRewards: () => Reward[];
  getTodayEarned: () => number;
  getTodaySpent: () => number;
  getAllHistory: () => { taskId: string; taskName: string; date: Date; credits: number }[];

  // Reset
  resetStore: () => void;
}

const initialStats: UserStats = {
  balance: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalEarned: 0,
  totalSpent: 0,
};

// Helper to convert API task to local task
const apiTaskToLocal = (task: APITask): Task => ({
  ...task,
  createdAt: new Date(task.createdAt),
  history: task.history.map(h => ({ ...h, date: new Date(h.date) })),
});

// Helper to convert API reward to local reward
const apiRewardToLocal = (reward: APIReward): Reward => ({
  ...reward,
  createdAt: new Date(reward.createdAt),
});

// Helper to convert API spend log to local spend log
const apiSpendLogToLocal = (log: APISpendLog): SpendLog => ({
  ...log,
  date: new Date(log.date),
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      rewards: [],
      spendLogs: [],
      stats: initialStats,
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,

      // Sync all data from server
      syncFromServer: async () => {
        set({ isSyncing: true, syncError: null });

        try {
          const { data, error } = await syncAPI.getAll();

          if (error || !data) {
            set({ isSyncing: false, syncError: error || "Failed to sync" });
            return;
          }

          set({
            tasks: data.tasks.map(apiTaskToLocal),
            rewards: data.rewards.map(apiRewardToLocal),
            spendLogs: data.spendLogs.map(apiSpendLogToLocal),
            stats: data.stats,
            isSyncing: false,
            lastSyncedAt: new Date(),
            syncError: null,
          });

          // Update auth store stats
          useAuthStore.getState().updateStats({
            balance: data.stats.balance,
            totalEarned: data.stats.totalEarned,
            totalSpent: data.stats.totalSpent,
          });
        } catch {
          set({ isSyncing: false, syncError: "Network error" });
        }
      },

      // Add any type of task - optimistic update
      addTask: async (task) => {
        const tempId = generateId();
        const newTask: Task = {
          ...task,
          id: tempId,
          createdAt: new Date(),
          count: 0,
          completed: false,
          history: [],
        };

        // Optimistic update
        set((state) => ({
          tasks: [newTask, ...state.tasks],
        }));

        // Sync with backend
        try {
          const { data, error } = await tasksAPI.create({
            title: task.title,
            category: task.category,
            type: task.type,
            reward: task.reward,
          });

          if (error || !data) {
            // Rollback on error
            set((state) => ({
              tasks: state.tasks.filter((t) => t.id !== tempId),
            }));
            return;
          }

          // Replace temp task with server task
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === tempId ? apiTaskToLocal(data.task) : t
            ),
          }));
        } catch {
          // Rollback on network error
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== tempId),
          }));
        }
      },

      updateTask: async (id, data) => {
        const taskToUpdate = get().tasks.find((t) => t.id === id);
        if (!taskToUpdate) return false;

        // Optimistic update
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...(data.title !== undefined && { title: data.title }),
                  ...(data.category !== undefined && { category: data.category }),
                  ...(data.reward !== undefined && { reward: data.reward }),
                }
              : t
          ),
        }));

        try {
          const { data: responseData, error } = await tasksAPI.update(id, data);

          if (error || !responseData) {
            // Rollback on error
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === id ? taskToUpdate : t
              ),
            }));
            return false;
          }

          // Update with server data
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? apiTaskToLocal(responseData.task) : t
            ),
          }));
          return true;
        } catch {
          // Rollback on network error
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? taskToUpdate : t
            ),
          }));
          return false;
        }
      },

      deleteTask: async (id) => {
        const taskToDelete = get().tasks.find((t) => t.id === id);
        if (!taskToDelete) return;

        // Optimistic update - mark as archived instead of removing
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, archived: true } : t
          ),
        }));

        try {
          const { error } = await tasksAPI.deleteById(id);

          if (error) {
            // Rollback on error - restore original state
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === id ? taskToDelete : t
              ),
            }));
          }
        } catch {
          // Rollback on network error
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? taskToDelete : t
            ),
          }));
        }
      },

      // For habits: increment count and log history
      incrementTask: async (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task || task.type !== "habit") return { success: false };

        const previousState = { tasks: get().tasks, stats: get().stats };

        // Optimistic update
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  count: t.count + 1,
                  history: [...t.history, { date: new Date(), credits: t.reward }],
                }
              : t
          ),
          stats: {
            ...state.stats,
            balance: state.stats.balance + task.reward,
            totalEarned: state.stats.totalEarned + task.reward,
          },
        }));

        // Update auth store
        useAuthStore.getState().updateStats({
          balance: get().stats.balance,
          totalEarned: get().stats.totalEarned,
        });

        try {
          const { data, error } = await tasksAPI.increment(id);

          if (error || !data) {
            // Rollback
            set({
              tasks: previousState.tasks,
              stats: previousState.stats,
            });
            useAuthStore.getState().updateStats({
              balance: previousState.stats.balance,
              totalEarned: previousState.stats.totalEarned,
            });
            return { success: false };
          }

          return { success: true, credits: data.credits };
        } catch {
          set({
            tasks: previousState.tasks,
            stats: previousState.stats,
          });
          useAuthStore.getState().updateStats({
            balance: previousState.stats.balance,
            totalEarned: previousState.stats.totalEarned,
          });
          return { success: false };
        }
      },

      // For habits: decrement count (only today's entries)
      decrementTask: async (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task || task.type !== "habit") return { success: false };

        // Check today's count
        const todayCount = task.history.filter((h) => isToday(new Date(h.date))).length;
        if (todayCount === 0) return { success: false };

        const previousState = { tasks: get().tasks, stats: get().stats };

        // Find the last today's history entry to remove
        const todayEntries = task.history.filter((h) => isToday(new Date(h.date)));
        const lastTodayEntry = todayEntries[todayEntries.length - 1];

        // Optimistic update - remove only the last today's entry
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            // Remove the last entry that matches today
            const newHistory = [...t.history];
            for (let i = newHistory.length - 1; i >= 0; i--) {
              if (isToday(new Date(newHistory[i].date))) {
                newHistory.splice(i, 1);
                break;
              }
            }
            return { ...t, count: t.count - 1, history: newHistory };
          }),
          stats: {
            ...state.stats,
            balance: state.stats.balance - task.reward,
            totalEarned: state.stats.totalEarned - task.reward,
          },
        }));

        useAuthStore.getState().updateStats({
          balance: get().stats.balance,
          totalEarned: get().stats.totalEarned,
        });

        try {
          const { data, error } = await tasksAPI.decrement(id);
          // Note: Backend should also only remove today's last entry
          void lastTodayEntry; // Used for reference

          if (error || !data) {
            set({
              tasks: previousState.tasks,
              stats: previousState.stats,
            });
            useAuthStore.getState().updateStats({
              balance: previousState.stats.balance,
              totalEarned: previousState.stats.totalEarned,
            });
            return { success: false };
          }

          return { success: true, credits: data.credits };
        } catch {
          set({
            tasks: previousState.tasks,
            stats: previousState.stats,
          });
          useAuthStore.getState().updateStats({
            balance: previousState.stats.balance,
            totalEarned: previousState.stats.totalEarned,
          });
          return { success: false };
        }
      },

      // For dailies/todos: toggle completion
      toggleTask: async (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task || task.type === "habit") return { success: false };

        // Use task.completed directly - backend already calculates it correctly
        const isCompleting = !task.completed;
        const previousState = { tasks: get().tasks, stats: get().stats };

        // Optimistic update
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;

            let newHistory = [...t.history];
            if (isCompleting) {
              // Add new completion
              newHistory = [...newHistory, { date: new Date(), credits: t.reward }];
            } else {
              // Remove today's entry for dailies, or last entry for todos
              if (t.type === "daily") {
                // Remove today's entry
                for (let i = newHistory.length - 1; i >= 0; i--) {
                  if (isToday(new Date(newHistory[i].date))) {
                    newHistory.splice(i, 1);
                    break;
                  }
                }
              } else {
                // For todos, remove last entry
                newHistory = newHistory.slice(0, -1);
              }
            }

            return {
              ...t,
              completed: !t.completed, // Toggle for both dailies and todos
              history: newHistory,
            };
          }),
          stats: {
            ...state.stats,
            balance: isCompleting
              ? state.stats.balance + task.reward
              : state.stats.balance - task.reward,
            totalEarned: isCompleting
              ? state.stats.totalEarned + task.reward
              : state.stats.totalEarned - task.reward,
          },
        }));

        useAuthStore.getState().updateStats({
          balance: get().stats.balance,
          totalEarned: get().stats.totalEarned,
        });

        try {
          const { data, error } = await tasksAPI.toggle(id);

          if (error || !data) {
            set({
              tasks: previousState.tasks,
              stats: previousState.stats,
            });
            useAuthStore.getState().updateStats({
              balance: previousState.stats.balance,
              totalEarned: previousState.stats.totalEarned,
            });
            return { success: false };
          }

          return { success: true, credits: data.credits, completed: data.completed };
        } catch {
          set({
            tasks: previousState.tasks,
            stats: previousState.stats,
          });
          useAuthStore.getState().updateStats({
            balance: previousState.stats.balance,
            totalEarned: previousState.stats.totalEarned,
          });
          return { success: false };
        }
      },

      // Reset all dailies at start of new day (local only for now)
      resetDailies: () =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.type === "daily" ? { ...t, completed: false } : t
          ),
        })),

      // Reward Actions
      addReward: async (reward) => {
        const tempId = generateId();
        const newReward: Reward = {
          ...reward,
          id: tempId,
          createdAt: new Date(),
        };

        set((state) => ({
          rewards: [newReward, ...state.rewards],
        }));

        try {
          const { data, error } = await rewardsAPI.create({
            name: reward.name,
            icon: reward.icon,
            cost: reward.cost,
            description: reward.description,
          });

          if (error || !data) {
            set((state) => ({
              rewards: state.rewards.filter((r) => r.id !== tempId),
            }));
            return;
          }

          set((state) => ({
            rewards: state.rewards.map((r) =>
              r.id === tempId ? apiRewardToLocal(data.reward) : r
            ),
          }));
        } catch {
          set((state) => ({
            rewards: state.rewards.filter((r) => r.id !== tempId),
          }));
        }
      },

      updateReward: async (id, data) => {
        const rewardToUpdate = get().rewards.find((r) => r.id === id);
        if (!rewardToUpdate) return false;

        // Optimistic update
        set((state) => ({
          rewards: state.rewards.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...(data.name !== undefined && { name: data.name }),
                  ...(data.cost !== undefined && { cost: data.cost }),
                  ...(data.description !== undefined && { description: data.description }),
                  ...(data.icon !== undefined && { icon: data.icon }),
                }
              : r
          ),
        }));

        try {
          const { data: responseData, error } = await rewardsAPI.update(id, data);

          if (error || !responseData) {
            // Rollback on error
            set((state) => ({
              rewards: state.rewards.map((r) =>
                r.id === id ? rewardToUpdate : r
              ),
            }));
            return false;
          }

          // Update with server data
          set((state) => ({
            rewards: state.rewards.map((r) =>
              r.id === id ? apiRewardToLocal(responseData.reward) : r
            ),
          }));
          return true;
        } catch {
          // Rollback on network error
          set((state) => ({
            rewards: state.rewards.map((r) =>
              r.id === id ? rewardToUpdate : r
            ),
          }));
          return false;
        }
      },

      archiveReward: async (id) => {
        const rewardToArchive = get().rewards.find((r) => r.id === id);
        if (!rewardToArchive) return false;

        // Optimistic update - mark as archived instead of removing
        set((state) => ({
          rewards: state.rewards.map((r) =>
            r.id === id ? { ...r, archived: true } : r
          ),
        }));

        try {
          const { error } = await rewardsAPI.archive(id);

          if (error) {
            // Rollback on error - restore original state
            set((state) => ({
              rewards: state.rewards.map((r) =>
                r.id === id ? rewardToArchive : r
              ),
            }));
            return false;
          }

          return true;
        } catch {
          // Rollback on network error
          set((state) => ({
            rewards: state.rewards.map((r) =>
              r.id === id ? rewardToArchive : r
            ),
          }));
          return false;
        }
      },

      deleteReward: async (id) => {
        const rewardToDelete = get().rewards.find((r) => r.id === id);

        set((state) => ({
          rewards: state.rewards.filter((r) => r.id !== id),
        }));

        try {
          const { error } = await rewardsAPI.delete(id);

          if (error && rewardToDelete) {
            set((state) => ({
              rewards: [...state.rewards, rewardToDelete],
            }));
          }
        } catch {
          if (rewardToDelete) {
            set((state) => ({
              rewards: [...state.rewards, rewardToDelete],
            }));
          }
        }
      },

      spendOnReward: async (rewardId) => {
        const state = get();
        const reward = state.rewards.find((r) => r.id === rewardId);
        if (!reward || state.stats.balance < reward.cost) {
          return false;
        }

        const previousStats = { ...state.stats };
        const tempLogId = generateId();

        // Optimistic update
        set((state) => ({
          spendLogs: [
            {
              id: tempLogId,
              rewardId,
              date: new Date(),
              creditsSpent: reward.cost,
            },
            ...state.spendLogs,
          ],
          stats: {
            ...state.stats,
            balance: state.stats.balance - reward.cost,
            totalSpent: state.stats.totalSpent + reward.cost,
          },
        }));

        useAuthStore.getState().updateStats({
          balance: get().stats.balance,
          totalSpent: get().stats.totalSpent,
        });

        try {
          const { data, error } = await rewardsAPI.spend(rewardId);

          if (error || !data) {
            // Rollback
            set((state) => ({
              spendLogs: state.spendLogs.filter((s) => s.id !== tempLogId),
              stats: previousStats,
            }));
            useAuthStore.getState().updateStats({
              balance: previousStats.balance,
              totalSpent: previousStats.totalSpent,
            });
            return false;
          }

          // Update with server data
          set((state) => ({
            spendLogs: state.spendLogs.map((s) =>
              s.id === tempLogId ? apiSpendLogToLocal(data.spendLog) : s
            ),
            stats: {
              ...state.stats,
              balance: data.stats.balance,
              totalSpent: data.stats.totalSpent,
            },
          }));

          useAuthStore.getState().updateStats({
            balance: data.stats.balance,
            totalSpent: data.stats.totalSpent,
          });

          return true;
        } catch {
          set((state) => ({
            spendLogs: state.spendLogs.filter((s) => s.id !== tempLogId),
            stats: previousStats,
          }));
          useAuthStore.getState().updateStats({
            balance: previousStats.balance,
            totalSpent: previousStats.totalSpent,
          });
          return false;
        }
      },

      // DERIVED DATA - data is already processed by backend
      // Filter out archived for dashboard display (but keep in tasks for history)
      // Habits: count is already today's count from backend
      getHabits: () => get().tasks.filter((t) => t.type === "habit" && !t.archived),

      // Dailies: completed status is already today's status from backend
      getDailies: () => get().tasks.filter((t) => t.type === "daily" && !t.archived),

      // Todos: filter archived and show only incomplete OR completed today
      getTodos: () => get().tasks.filter((t) => {
        if (t.type !== "todo" || t.archived) return false;
        // Show if incomplete OR completed today
        if (t.completed) {
          const lastHistory = t.history[0];
          return lastHistory && isToday(new Date(lastHistory.date));
        }
        return true;
      }),

      // Active rewards for dashboard (non-archived)
      getActiveRewards: () => get().rewards.filter((r) => !r.archived),

      getTodayEarned: () => {
        const tasks = get().tasks;
        let total = 0;
        tasks.forEach((task) => {
          task.history.forEach((h) => {
            if (isToday(new Date(h.date))) {
              total += h.credits;
            }
          });
        });
        return total;
      },

      getTodaySpent: () => {
        return get()
          .spendLogs.filter((log) => isToday(new Date(log.date)))
          .reduce((sum, log) => sum + log.creditsSpent, 0);
      },

      getAllHistory: () => {
        const tasks = get().tasks;
        const allHistory: { taskId: string; taskName: string; date: Date; credits: number }[] = [];

        tasks.forEach((task) => {
          task.history.forEach((h) => {
            allHistory.push({
              taskId: task.id,
              taskName: task.title,
              date: h.date,
              credits: h.credits,
            });
          });
        });

        return allHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      resetStore: () => {
        set({
          tasks: [],
          rewards: [],
          spendLogs: [],
          stats: initialStats,
          isSyncing: false,
          lastSyncedAt: null,
          syncError: null,
        });
      },
    }),
    {
      name: "earnit-storage",
    }
  )
);

// Helper exports for backwards compatibility
export type Habit = Task;
export type Daily = Task;
export type TodoItem = Task;
