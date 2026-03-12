import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT - Update task details (title, category, reward)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await validateRequest();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await req.json();
    const { title, category, reward } = body;

    // Verify task belongs to user
    const task = await db.task.findFirst({
      where: { id: taskId, userId: user.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Build update data
    const updateData: { title?: string; category?: string; reward?: number } = {};
    if (title !== undefined) updateData.title = title;
    if (category !== undefined) updateData.category = category;
    if (reward !== undefined) updateData.reward = reward;

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: { history: true },
    });

    return NextResponse.json({
      success: true,
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        category: updatedTask.category,
        type: updatedTask.type,
        reward: updatedTask.reward,
        count: updatedTask.count,
        completed: updatedTask.completed,
        createdAt: updatedTask.createdAt,
        history: updatedTask.history.map((h) => ({
          date: h.date,
          credits: h.credits,
        })),
      },
    });
  } catch (error) {
    console.error("Update task error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Archive a task (soft delete to preserve history)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await validateRequest();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;

    // Verify task belongs to user
    const task = await db.task.findFirst({
      where: { id: taskId, userId: user.id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Archive instead of delete to preserve history
    await db.task.update({
      where: { id: taskId },
      data: { archived: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Archive task error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to archive task";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Helper to check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Helper to get start of today
function getStartOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// PATCH - Update task (increment, decrement, toggle)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await validateRequest();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await req.json();
    const { action } = body; // 'increment', 'decrement', 'toggle'

    // Verify task belongs to user
    const task = await db.task.findFirst({
      where: { id: taskId, userId: user.id },
      include: { history: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Handle different actions
    if (action === "increment" && task.type === "habit") {
      // Increment habit count and add history
      await db.$transaction([
        db.task.update({
          where: { id: taskId },
          data: { count: { increment: 1 } },
        }),
        db.taskHistory.create({
          data: {
            taskId,
            credits: task.reward,
          },
        }),
        db.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: task.reward },
            totalEarned: { increment: task.reward },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        credits: task.reward,
        action: "earned",
      });
    }

    if (action === "decrement" && task.type === "habit") {
      // Get today's history entries count
      const todayEntries = task.history.filter((h) => isToday(new Date(h.date)));

      if (todayEntries.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No entries to remove today",
        });
      }

      // Get the latest TODAY's history entry
      const latestTodayHistory = await db.taskHistory.findFirst({
        where: {
          taskId,
          date: { gte: getStartOfToday() },
        },
        orderBy: { date: "desc" },
      });

      if (latestTodayHistory) {
        await db.$transaction([
          db.task.update({
            where: { id: taskId },
            data: { count: { decrement: 1 } },
          }),
          db.taskHistory.delete({
            where: { id: latestTodayHistory.id },
          }),
          db.user.update({
            where: { id: user.id },
            data: {
              balance: { decrement: task.reward },
              totalEarned: { decrement: task.reward },
            },
          }),
        ]);
      }

      return NextResponse.json({
        success: true,
        credits: task.reward,
        action: "removed",
      });
    }

    if (action === "toggle" && (task.type === "daily" || task.type === "todo")) {
      // For dailies, check if completed TODAY
      const completedToday = task.type === "daily"
        ? task.history.some((h) => isToday(new Date(h.date)))
        : task.completed;

      const isCompleting = !completedToday;

      if (isCompleting) {
        await db.$transaction([
          db.task.update({
            where: { id: taskId },
            data: { completed: task.type === "todo" ? true : task.completed },
          }),
          db.taskHistory.create({
            data: {
              taskId,
              credits: task.reward,
            },
          }),
          db.user.update({
            where: { id: user.id },
            data: {
              balance: { increment: task.reward },
              totalEarned: { increment: task.reward },
            },
          }),
        ]);

        return NextResponse.json({
          success: true,
          credits: task.reward,
          action: "earned",
          completed: true,
        });
      } else {
        // Uncompleting
        let historyToDelete;

        if (task.type === "daily") {
          // For dailies, remove today's entry
          historyToDelete = await db.taskHistory.findFirst({
            where: {
              taskId,
              date: { gte: getStartOfToday() },
            },
            orderBy: { date: "desc" },
          });
        } else {
          // For todos, remove the last entry
          historyToDelete = await db.taskHistory.findFirst({
            where: { taskId },
            orderBy: { date: "desc" },
          });
        }

        if (historyToDelete) {
          await db.$transaction([
            db.task.update({
              where: { id: taskId },
              data: { completed: task.type === "todo" ? false : task.completed },
            }),
            db.taskHistory.delete({
              where: { id: historyToDelete.id },
            }),
            db.user.update({
              where: { id: user.id },
              data: {
                balance: { decrement: task.reward },
                totalEarned: { decrement: task.reward },
              },
            }),
          ]);
        }

        return NextResponse.json({
          success: true,
          credits: task.reward,
          action: "removed",
          completed: false,
        });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Task action error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
