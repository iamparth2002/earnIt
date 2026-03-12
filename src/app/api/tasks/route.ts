import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Create a new task
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await validateRequest();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, category, type, reward } = body;

    if (!title || !category || !type || reward === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate task type
    if (!["habit", "daily", "todo"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid task type" },
        { status: 400 }
      );
    }

    const task = await db.task.create({
      data: {
        title,
        category,
        type,
        reward,
        userId: user.id,
      },
      include: { history: true },
    });

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        category: task.category,
        type: task.type,
        reward: task.reward,
        count: task.count,
        completed: task.completed,
        createdAt: task.createdAt,
        history: [],
      },
    });
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a task
export async function DELETE(req: NextRequest) {
  try {
    const { user, error } = await validateRequest();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Verify task belongs to user
    const task = await db.task.findFirst({
      where: { id: taskId, userId: user.id },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    await db.task.delete({ where: { id: taskId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
