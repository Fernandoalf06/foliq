import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { profileUpdateSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid profile data" },
        { status: 400 },
      );
    }

    const { name, currency } = parsed.data;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name, currency },
      select: {
        id: true,
        email: true,
        name: true,
        currency: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
