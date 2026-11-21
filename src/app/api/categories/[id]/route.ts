import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { categoryUpdateSchema, uuidSchema } from "@/lib/validators";

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
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = categoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid category update" },
        { status: 400 },
      );
    }

    if (
      parsed.data.name !== undefined &&
      parsed.data.name.toLowerCase() !== existing.name.toLowerCase()
    ) {
      const duplicate = await prisma.category.findFirst({
        where: {
          userId: user.id,
          type: existing.type,
          id: { not: id },
          name: { equals: parsed.data.name, mode: "insensitive" },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "A category with this name already exists" },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.icon !== undefined ? { icon: parsed.data.icon } : {}),
      },
      select: { id: true, name: true, type: true, icon: true },
    });

    return NextResponse.json({ category: updated });
  } catch (error) {
    console.error("Category PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
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
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const [sameTypeCount, recurringCount] = await Promise.all([
      prisma.category.count({
        where: { userId: user.id, type: existing.type },
      }),
      prisma.recurringRule.count({
        where: { userId: user.id, categoryId: id },
      }),
    ]);

    if (sameTypeCount <= 1) {
      return NextResponse.json(
        {
          error: `You must keep at least one ${existing.type.toLowerCase()} category.`,
        },
        { status: 400 },
      );
    }

    if (recurringCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a category linked to a recurring schedule. Remove the recurring rule first.",
        },
        { status: 400 },
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Category DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
