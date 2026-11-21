import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  clampTimezoneOffset,
  escapeCsvCell,
  getMonthRangeForOffset,
} from "@/lib/money";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const month = request.nextUrl.searchParams.get("month");
    const rawTzOffset = request.nextUrl.searchParams.get("tzOffset");
    const parsedTz =
      rawTzOffset !== null ? Number.parseInt(rawTzOffset, 10) : 0;
    const tzOffset = clampTimezoneOffset(
      Number.isFinite(parsedTz) ? parsedTz : 0,
    );

    const where: {
      userId: string;
      occurredAt?: { gte: Date; lt: Date };
    } = { userId: user.id };

    if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      const { start, end } = getMonthRangeForOffset(month, tzOffset);
      where.occurredAt = { gte: start, lt: end };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        wallet: { select: { name: true } },
        targetWallet: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { occurredAt: "desc" },
    });

    const header = [
      "Date",
      "Type",
      "Amount",
      "Currency",
      "Wallet",
      "Target Wallet",
      "Category",
      "Note",
    ].join(",");

    const rows = transactions.map((tx) =>
      [
        escapeCsvCell(tx.occurredAt.toISOString()),
        escapeCsvCell(tx.type),
        escapeCsvCell(tx.amount.toString(), { numeric: true }),
        escapeCsvCell(user.currency),
        escapeCsvCell(tx.wallet.name),
        escapeCsvCell(tx.targetWallet?.name ?? ""),
        escapeCsvCell(tx.category?.name ?? "Transfer"),
        escapeCsvCell(tx.note),
      ].join(","),
    );

    const csv = [header, ...rows].join("\r\n");
    const safeMonth =
      month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null;
    const filename = safeMonth
      ? `foliq-${safeMonth}.csv`
      : "foliq-all-transactions.csv";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export GET error:", error);
    return NextResponse.json(
      { error: "Failed to export CSV" },
      { status: 500 },
    );
  }
}
