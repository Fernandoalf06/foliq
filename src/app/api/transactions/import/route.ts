import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toMinorUnits } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";
import { transactionImportBatchSchema } from "@/lib/validators";

function buildDuplicateKey(
  type: string,
  amountMinor: number,
  occurredAt: Date,
  note: string,
): string {
  const dayKey = occurredAt.toISOString().slice(0, 10);
  return `${type}|${amountMinor}|${dayKey}|${note.trim().toLowerCase()}`;
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
    const parsed = transactionImportBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid CSV import batch" },
        { status: 400 },
      );
    }

    const {
      walletId,
      defaultExpenseCategoryId,
      defaultIncomeCategoryId,
      skipDuplicates,
      entries,
    } = parsed.data;

    const [wallet, categories] = await Promise.all([
      prisma.wallet.findFirst({
        where: { id: walletId, userId: user.id, isArchived: false },
      }),
      prisma.category.findMany({
        where: { userId: user.id },
      }),
    ]);

    if (!wallet) {
      return NextResponse.json(
        { error: "Selected active wallet not found" },
        { status: 404 },
      );
    }

    const expenseDefault = categories.find(
      (c) => c.id === defaultExpenseCategoryId && c.type === "EXPENSE",
    );
    const incomeDefault = categories.find(
      (c) => c.id === defaultIncomeCategoryId && c.type === "INCOME",
    );

    if (!expenseDefault || !incomeDefault) {
      return NextResponse.json(
        { error: "Default expense and income categories must belong to your account" },
        { status: 400 },
      );
    }

    // Build case-insensitive category lookup by type + name
    const categoryLookup = new Map<string, string>();
    for (const c of categories) {
      categoryLookup.set(`${c.type}:${c.name.trim().toLowerCase()}`, c.id);
    }

    const parsedDates = entries.map((e) => new Date(e.occurredAt));
    let minMs = parsedDates[0].getTime();
    let maxMs = parsedDates[0].getTime();
    for (const d of parsedDates) {
      const t = d.getTime();
      if (t < minMs) minMs = t;
      if (t > maxMs) maxMs = t;
    }

    const existingKeys = new Set<string>();
    if (skipDuplicates) {
      const oneDayMs = 24 * 60 * 60 * 1000;
      const existingRows = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          walletId: wallet.id,
          type: { in: ["EXPENSE", "INCOME"] },
          occurredAt: {
            gte: new Date(minMs - oneDayMs),
            lte: new Date(maxMs + oneDayMs),
          },
        },
        select: {
          type: true,
          amount: true,
          occurredAt: true,
          note: true,
        },
      });
      for (const row of existingRows) {
        existingKeys.add(
          buildDuplicateKey(
            row.type,
            toMinorUnits(row.amount.toString()),
            row.occurredAt,
            row.note,
          ),
        );
      }
    }

    const toInsert: Array<{
      userId: string;
      type: "EXPENSE" | "INCOME";
      amount: number;
      walletId: string;
      categoryId: string;
      note: string;
      occurredAt: Date;
    }> = [];
    let skippedDuplicates = 0;

    for (const entry of entries) {
      const occurredDate = new Date(entry.occurredAt);
      const dupKey = buildDuplicateKey(
        entry.type,
        toMinorUnits(entry.amount),
        occurredDate,
        entry.note,
      );

      if (skipDuplicates && existingKeys.has(dupKey)) {
        skippedDuplicates += 1;
        continue;
      }

      if (skipDuplicates) {
        existingKeys.add(dupKey);
      }

      const matchedCategoryId = entry.categoryName
        ? categoryLookup.get(
            `${entry.type}:${entry.categoryName.trim().toLowerCase()}`,
          )
        : undefined;

      const resolvedCategoryId =
        matchedCategoryId ??
        (entry.type === "INCOME" ? incomeDefault.id : expenseDefault.id);

      toInsert.push({
        userId: user.id,
        type: entry.type,
        amount: entry.amount,
        walletId: wallet.id,
        categoryId: resolvedCategoryId,
        note: entry.note,
        occurredAt: occurredDate,
      });
    }

    if (toInsert.length > 0) {
      await prisma.transaction.createMany({ data: toInsert });
    }

    return NextResponse.json(
      {
        imported: toInsert.length,
        skippedDuplicates,
        walletName: wallet.name,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CSV Import POST error:", error);
    return NextResponse.json(
      { error: "Failed to import CSV transactions" },
      { status: 500 },
    );
  }
}
