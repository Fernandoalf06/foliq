import { NextRequest, NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  await destroyCurrentSession();
  return NextResponse.json({ ok: true });
}
