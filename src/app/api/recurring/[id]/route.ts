import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { recurringRuleUpdateSchema, uuidSchema } from "@/lib/validators";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: "Invalid recurring rule ID" },
        { status: 400 },
      );
    }

    const existing = await prisma.recurringRule.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Recurring rule not found" },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = recurringRuleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid recurring update" },
        { status: 400 },
      );
    }

    const updated = await prisma.recurringRule.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.amount !== undefined
          ? { amount: parsed.data.amount }
          : {}),
        ...(parsed.data.cadence !== undefined
          ? { cadence: parsed.data.cadence }
          : {}),
        ...(parsed.data.nextDueDate !== undefined
          ? { nextDueDate: new Date(parsed.data.nextDueDate) }
          : {}),
        ...(parsed.data.isActive !== undefined
          ? { isActive: parsed.data.isActive }
          : {}),
        ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
      },
    });

    return NextResponse.json({
      recurringRule: {
        id: updated.id,
        title: updated.title,
        isActive: updated.isActive,
        nextDueDate: updated.nextDueDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("Recurring PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update recurring rule" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: "Invalid recurring rule ID" },
        { status: 400 },
      );
    }

    const existing = await prisma.recurringRule.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Recurring rule not found" },
        { status: 404 },
      );
    }

    await prisma.recurringRule.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Recurring DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete recurring rule" },
      { status: 500 },
    );
  }
}
