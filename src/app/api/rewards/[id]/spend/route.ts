import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Spend credits on a reward
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await validateRequest();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rewardId } = await params;

    // Get reward and check if user can afford it
    const reward = await db.reward.findFirst({
      where: { id: rewardId, userId: user.id },
    });

    if (!reward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    // Get current user balance
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { balance: true },
    });

    if (!currentUser || currentUser.balance < reward.cost) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Spend on reward - atomic transaction
    const [spendLog, updatedUser] = await db.$transaction([
      db.spendLog.create({
        data: {
          rewardId,
          userId: user.id,
          creditsSpent: reward.cost,
        },
      }),
      db.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: reward.cost },
          totalSpent: { increment: reward.cost },
        },
        select: {
          balance: true,
          totalSpent: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      spendLog: {
        id: spendLog.id,
        rewardId: spendLog.rewardId,
        date: spendLog.date,
        creditsSpent: spendLog.creditsSpent,
      },
      stats: {
        balance: updatedUser.balance,
        totalSpent: updatedUser.totalSpent,
      },
    });
  } catch (error) {
    console.error("Spend reward error:", error);
    return NextResponse.json(
      { error: "Failed to spend on reward" },
      { status: 500 }
    );
  }
}
