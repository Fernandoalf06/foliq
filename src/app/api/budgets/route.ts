import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { budgetUpsertSchema, uuidSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = budgetUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid budget data" },
        { status: 400 },
      );
    }

    const { categoryId, month, limitAmount } = parsed.data;
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: user.id, type: "EXPENSE" },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Expense category not found" },
        { status: 404 },
      );
    }

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month: {
          userId: user.id,
          categoryId,
          month,
        },
      },
      update: { limitAmount },
      create: {
        userId: user.id,
        categoryId,
        month,
        limitAmount,
      },
    });

    return NextResponse.json(
      {
        budget: {
          id: budget.id,
          categoryId: budget.categoryId,
          month: budget.month,
          limitAmount: Number(budget.limitAmount.toString()),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Budget POST error:", error);
    return NextResponse.json(
      { error: "Failed to save budget" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = request.nextUrl.searchParams.get("id");
    if (!id || !uuidSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid budget ID" }, { status: 400 });
    }
    const existing = await prisma.budget.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }
    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Budget DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove budget" },
      { status: 500 },
    );
  }
}
