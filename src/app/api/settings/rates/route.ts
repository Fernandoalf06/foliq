import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  resolveExchangeRate,
  SUPPORTED_CURRENCIES,
  type SavedRateRecord,
} from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { exchangeRateUpsertSchema } from "@/lib/validators";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.exchangeRate.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  const saved: SavedRateRecord[] = rows.map((r) => ({
    fromCurrency: r.fromCurrency,
    toCurrency: r.toCurrency,
    rate: Number(r.rate.toString()),
  }));

  const rates = SUPPORTED_CURRENCIES.filter((c) => c !== user.currency).map(
    (fromCurrency) => {
      const resolved = resolveExchangeRate(fromCurrency, user.currency, saved);
      const exactRow = rows.find(
        (r) =>
          (r.fromCurrency === fromCurrency && r.toCurrency === user.currency) ||
          (r.fromCurrency === user.currency && r.toCurrency === fromCurrency),
      );
      return {
        fromCurrency,
        toCurrency: user.currency,
        rate: Number(resolved.rate.toFixed(6)),
        isCustom: resolved.isCustom,
        updatedAt: exactRow ? exactRow.updatedAt.toISOString() : null,
      };
    },
  );

  return NextResponse.json({ primaryCurrency: user.currency, rates });
}

export async function PUT(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = exchangeRateUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid exchange rate" },
        { status: 400 },
      );
    }

    const { fromCurrency, toCurrency, rate } = parsed.data;

    const [, saved] = await prisma.$transaction([
      prisma.exchangeRate.deleteMany({
        where: {
          userId: user.id,
          fromCurrency: toCurrency,
          toCurrency: fromCurrency,
        },
      }),
      prisma.exchangeRate.upsert({
        where: {
          userId_fromCurrency_toCurrency: {
            userId: user.id,
            fromCurrency,
            toCurrency,
          },
        },
        create: {
          userId: user.id,
          fromCurrency,
          toCurrency,
          rate,
        },
        update: {
          rate,
        },
      }),
    ]);

    return NextResponse.json({
      rate: {
        fromCurrency: saved.fromCurrency,
        toCurrency: saved.toCurrency,
        rate: Number(saved.rate.toString()),
        isCustom: true,
        updatedAt: saved.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("ExchangeRate PUT error:", error);
    return NextResponse.json(
      { error: "Failed to save exchange rate" },
      { status: 500 },
    );
  }
}
