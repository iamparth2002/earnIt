import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT - Update reward details (name, cost, archived)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await validateRequest();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rewardId } = await params;
    const body = await req.json();
    const { name, cost, archived, description, icon } = body;

    // Verify reward belongs to user
    const reward = await db.reward.findFirst({
      where: { id: rewardId, userId: user.id },
    });

    if (!reward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    // Build update data
    const updateData: {
      name?: string;
      cost?: number;
      archived?: boolean;
      description?: string;
      icon?: string;
    } = {};
    if (name !== undefined) updateData.name = name;
    if (cost !== undefined) updateData.cost = cost;
    if (archived !== undefined) updateData.archived = archived;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;

    const updatedReward = await db.reward.update({
      where: { id: rewardId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      reward: {
        id: updatedReward.id,
        name: updatedReward.name,
        description: updatedReward.description,
        icon: updatedReward.icon,
        cost: updatedReward.cost,
        archived: updatedReward.archived,
        createdAt: updatedReward.createdAt,
      },
    });
  } catch (error) {
    console.error("Update reward error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update reward";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
