import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { uuidSchema } from "@/lib/validators";

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
      return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
    }

    const existing = await prisma.apiToken.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    await prisma.apiToken.delete({ where: { id } });
    return NextResponse.json({ revoked: true });
  } catch (error) {
    console.error("API Token DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to revoke API token" },
      { status: 500 },
    );
  }
}
