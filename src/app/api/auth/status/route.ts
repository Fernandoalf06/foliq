import { NextResponse } from "next/server";
import { getAllowedOwnerEmail, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [user, userCount] = await Promise.all([
      getCurrentUser(),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      authenticated: Boolean(user),
      user,
      hasOwnerAccount: userCount > 0,
      ownerConfigured: Boolean(getAllowedOwnerEmail()),
    });
  } catch (error) {
    console.error("Auth status error:", error);
    return NextResponse.json(
      { error: "Unable to verify authentication status" },
      { status: 500 },
    );
  }
}
