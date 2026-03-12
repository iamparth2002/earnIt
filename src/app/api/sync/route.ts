import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper to check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// GET - Fetch all user data (single source of truth)
// Data is processed server-side for daily resets
export async function GET() {
  try {
    const { user, error } = await validateRequest();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all user data in parallel (include archived for history)
    const [tasks, rewards, spendLogs] = await Promise.all([
      db.task.findMany({
        where: { userId: user.id },
        include: { history: { orderBy: { date: "desc" } } },
        orderBy: { createdAt: "desc" },
      }),
      db.reward.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      db.spendLog.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
      }),
    ]);

    // Process tasks with daily reset logic (include archived flag for history)
    const processedTasks = tasks.map((t) => {
      const todayHistory = t.history.filter((h) => isToday(new Date(h.date)));

      if (t.type === "habit") {
        // Habits: count = today's completions only
        return {
          id: t.id,
          title: t.title,
          category: t.category,
          type: t.type,
          reward: t.reward,
          count: todayHistory.length,
          completed: t.completed,
          archived: t.archived,
          createdAt: t.createdAt,
          history: t.history.map((h) => ({
            date: h.date,
            credits: h.credits,
          })),
        };
      }

      if (t.type === "daily") {
        // Dailies: completed = true only if done today
        return {
          id: t.id,
          title: t.title,
          category: t.category,
          type: t.type,
          reward: t.reward,
          count: t.count,
          completed: todayHistory.length > 0,
          archived: t.archived,
          createdAt: t.createdAt,
          history: t.history.map((h) => ({
            date: h.date,
            credits: h.credits,
          })),
        };
      }

      // Todos: return with archived flag
      return {
        id: t.id,
        title: t.title,
        category: t.category,
        type: t.type,
        reward: t.reward,
        count: t.count,
        completed: t.completed,
        archived: t.archived,
        createdAt: t.createdAt,
        history: t.history.map((h) => ({
          date: h.date,
          credits: h.credits,
        })),
      };
    });

    return NextResponse.json({
      tasks: processedTasks,
      rewards: rewards.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        icon: r.icon,
        cost: r.cost,
        archived: r.archived,
        createdAt: r.createdAt,
      })),
      spendLogs: spendLogs.map((s) => ({
        id: s.id,
        rewardId: s.rewardId,
        date: s.date,
        creditsSpent: s.creditsSpent,
      })),
      stats: {
        balance: user.balance,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
      },
    });
  } catch (error) {
    console.error("Sync GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
