import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { recurringRuleCreateSchema } from "@/lib/validators";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.recurringRule.findMany({
    where: { userId: user.id },
    include: {
      wallet: { select: { id: true, name: true, type: true } },
      category: { select: { id: true, name: true, icon: true, type: true } },
    },
    orderBy: [{ isActive: "desc" }, { nextDueDate: "asc" }],
  });

  return NextResponse.json({
    recurringRules: rules.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      amount: Number(r.amount.toString()),
      cadence: r.cadence,
      nextDueDate: r.nextDueDate.toISOString(),
      isActive: r.isActive,
      note: r.note,
      wallet: r.wallet,
      category: r.category,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = recurringRuleCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid recurring rule" },
        { status: 400 },
      );
    }

    const { title, type, amount, walletId, categoryId, cadence, nextDueDate, note } =
      parsed.data;

    const [wallet, category] = await Promise.all([
      prisma.wallet.findFirst({
        where: { id: walletId, userId: user.id, isArchived: false },
      }),
      prisma.category.findFirst({
        where: { id: categoryId, userId: user.id, type },
      }),
    ]);

    if (!wallet) {
      return NextResponse.json(
        { error: "Active wallet not found" },
        { status: 404 },
      );
    }
    if (!category) {
      return NextResponse.json(
        { error: "Category does not match recurring entry type" },
        { status: 400 },
      );
    }

    const created = await prisma.recurringRule.create({
      data: {
        userId: user.id,
        title,
        type,
        amount,
        walletId,
        categoryId,
        cadence,
        nextDueDate: new Date(nextDueDate),
        note,
      },
      include: {
        wallet: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true, icon: true, type: true } },
      },
    });

    return NextResponse.json(
      {
        recurringRule: {
          id: created.id,
          title: created.title,
          type: created.type,
          amount: Number(created.amount.toString()),
          cadence: created.cadence,
          nextDueDate: created.nextDueDate.toISOString(),
          isActive: created.isActive,
          note: created.note,
          wallet: created.wallet,
          category: created.category,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Recurring POST error:", error);
    return NextResponse.json(
      { error: "Failed to create recurring rule" },
      { status: 500 },
    );
  }
}
