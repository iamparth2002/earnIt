import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Create a new reward
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await validateRequest();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, icon, cost, description } = body;

    if (!name || cost === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const reward = await db.reward.create({
      data: {
        name,
        icon: icon || "Gift",
        cost,
        description,
        userId: user.id,
      },
    });

    return NextResponse.json({
      reward: {
        id: reward.id,
        name: reward.name,
        description: reward.description,
        icon: reward.icon,
        cost: reward.cost,
        createdAt: reward.createdAt,
      },
    });
  } catch (error) {
    console.error("Create reward error:", error);
    return NextResponse.json(
      { error: "Failed to create reward" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a reward
export async function DELETE(req: NextRequest) {
  try {
    const { user, error } = await validateRequest();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rewardId = searchParams.get("id");

    if (!rewardId) {
      return NextResponse.json(
        { error: "Reward ID is required" },
        { status: 400 }
      );
    }

    // Verify reward belongs to user
    const reward = await db.reward.findFirst({
      where: { id: rewardId, userId: user.id },
    });

    if (!reward) {
      return NextResponse.json(
        { error: "Reward not found" },
        { status: 404 }
      );
    }

    await db.reward.delete({ where: { id: rewardId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete reward error:", error);
    return NextResponse.json(
      { error: "Failed to delete reward" },
      { status: 500 }
    );
  }
}
