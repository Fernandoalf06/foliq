import { NextRequest, NextResponse } from "next/server";
import { generateApiToken, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { apiTokenCreateSchema } from "@/lib/validators";

const MAX_TOKENS_PER_USER = 10;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await prisma.apiToken.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    tokens: tokens.map((t) => ({
      id: t.id,
      name: t.name,
      tokenPrefix: t.tokenPrefix,
      lastUsedAt: t.lastUsedAt ? t.lastUsedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
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
    const parsed = apiTokenCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid token name" },
        { status: 400 },
      );
    }

    const count = await prisma.apiToken.count({ where: { userId: user.id } });
    if (count >= MAX_TOKENS_PER_USER) {
      return NextResponse.json(
        {
          error: `Maximum of ${MAX_TOKENS_PER_USER} active API tokens reached. Revoke an unused token first.`,
        },
        { status: 400 },
      );
    }

    const { rawToken, tokenPrefix, tokenHash } = generateApiToken();

    const created = await prisma.apiToken.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        tokenPrefix,
        tokenHash,
      },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        token: {
          id: created.id,
          name: created.name,
          tokenPrefix: created.tokenPrefix,
          lastUsedAt: null,
          createdAt: created.createdAt.toISOString(),
        },
        rawToken,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("API Token POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate API token" },
      { status: 500 },
    );
  }
}
