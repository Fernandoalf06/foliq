import { describe, expect, it } from "vitest";
import {
  apiTokenCreateSchema,
  budgetCopySchema,
  categoryUpdateSchema,
  exchangeRateUpsertSchema,
  passwordChangeSchema,
  profileUpdateSchema,
  recurringRuleCreateSchema,
  recurringRuleUpdateSchema,
  savingsGoalCreateSchema,
  savingsGoalUpdateSchema,
  shortcutRecordSchema,
  transactionCreateSchema,
  transactionImportBatchSchema,
  uuidSchema,
} from "./validators";

describe("validation schemas", () => {
  it("validates UUIDs strictly", () => {
    expect(
      uuidSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success,
    ).toBe(true);
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(uuidSchema.safeParse("").success).toBe(false);
  });

  it("enforces transaction transfer and category invariants", () => {
    const walletA = "550e8400-e29b-41d4-a716-446655440001";
    const walletB = "550e8400-e29b-41d4-a716-446655440002";
    const cat = "550e8400-e29b-41d4-a716-446655440003";

    expect(
      transactionCreateSchema.safeParse({
        type: "TRANSFER",
        amount: 50000,
        walletId: walletA,
        targetWalletId: walletA,
      }).success,
    ).toBe(false);

    expect(
      transactionCreateSchema.safeParse({
        type: "TRANSFER",
        amount: 50000,
        walletId: walletA,
        targetWalletId: walletB,
      }).success,
    ).toBe(true);

    expect(
      transactionCreateSchema.safeParse({
        type: "EXPENSE",
        amount: 25000,
        walletId: walletA,
        categoryId: null,
      }).success,
    ).toBe(false);

    expect(
      transactionCreateSchema.safeParse({
        type: "EXPENSE",
        amount: 25000,
        walletId: walletA,
        categoryId: cat,
      }).success,
    ).toBe(true);
  });

  it("validates profile updates and password change rules", () => {
    expect(
      profileUpdateSchema.safeParse({ name: "Fernando", currency: "IDR" })
        .success,
    ).toBe(true);
    expect(
      profileUpdateSchema.safeParse({ name: "A", currency: "IDR" }).success,
    ).toBe(false);

    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword456!",
        confirmPassword: "DifferentPassword!",
      }).success,
    ).toBe(false);

    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "SamePassword123!",
        newPassword: "SamePassword123!",
        confirmPassword: "SamePassword123!",
      }).success,
    ).toBe(false);

    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "OldPassword123!",
        newPassword: "NewPassword456!",
        confirmPassword: "NewPassword456!",
      }).success,
    ).toBe(true);
  });

  it("validates recurring rules, API tokens, and Apple Shortcuts payloads", () => {
    const walletA = "550e8400-e29b-41d4-a716-446655440001";
    const cat = "550e8400-e29b-41d4-a716-446655440003";

    expect(
      recurringRuleCreateSchema.safeParse({
        title: "Home Internet",
        type: "EXPENSE",
        amount: 350000,
        cadence: "MONTHLY",
        nextDueDate: "2026-07-01T00:00:00.000Z",
        walletId: walletA,
        categoryId: cat,
      }).success,
    ).toBe(true);

    expect(
      recurringRuleCreateSchema.safeParse({
        title: "Bad Rule",
        type: "EXPENSE",
        amount: -10,
        cadence: "MONTHLY",
        nextDueDate: "2026-07-01T00:00:00.000Z",
        walletId: walletA,
        categoryId: cat,
      }).success,
    ).toBe(false);

    expect(
      recurringRuleUpdateSchema.safeParse({ isActive: false }).success,
    ).toBe(true);

    expect(apiTokenCreateSchema.safeParse({ name: "iPhone 16 Pro" }).success).toBe(
      true,
    );
    expect(apiTokenCreateSchema.safeParse({ name: "X" }).success).toBe(false);

    expect(
      shortcutRecordSchema.safeParse({
        amount: 35000,
        type: "EXPENSE",
        wallet: "Cash",
        category: "Food & Dining",
        note: "Kopi Kenangan",
      }).success,
    ).toBe(true);

    expect(
      shortcutRecordSchema.safeParse({
        amount: 0,
      }).success,
    ).toBe(false);
  });

  it("validates savings goals and exchange rate schemas", () => {
    expect(
      savingsGoalCreateSchema.safeParse({
        name: "Emergency Fund",
        targetAmount: 25000000,
        currentAmount: 5000000,
        currency: "IDR",
      }).success,
    ).toBe(true);

    expect(
      savingsGoalCreateSchema.safeParse({
        name: "Invalid Goal",
        targetAmount: 0,
      }).success,
    ).toBe(false);

    expect(
      savingsGoalUpdateSchema.safeParse({ deltaAmount: 1000000 }).success,
    ).toBe(true);

    expect(
      exchangeRateUpsertSchema.safeParse({
        fromCurrency: "USD",
        toCurrency: "IDR",
        rate: 16250,
      }).success,
    ).toBe(true);

    expect(
      exchangeRateUpsertSchema.safeParse({
        fromCurrency: "USD",
        toCurrency: "USD",
        rate: 1,
      }).success,
    ).toBe(false);

    const walletA = "550e8400-e29b-41d4-a716-446655440001";
    const expCat = "550e8400-e29b-41d4-a716-446655440002";
    const incCat = "550e8400-e29b-41d4-a716-446655440003";

    expect(
      transactionImportBatchSchema.safeParse({
        walletId: walletA,
        defaultExpenseCategoryId: expCat,
        defaultIncomeCategoryId: incCat,
        skipDuplicates: true,
        entries: [
          {
            type: "EXPENSE",
            amount: 45000,
            occurredAt: "2026-11-20T05:00:00.000Z",
            note: "Coffee",
          },
        ],
      }).success,
    ).toBe(true);

    expect(
      transactionImportBatchSchema.safeParse({
        walletId: walletA,
        defaultExpenseCategoryId: expCat,
        defaultIncomeCategoryId: incCat,
        entries: [],
      }).success,
    ).toBe(false);

    expect(
      budgetCopySchema.safeParse({ targetMonth: "2026-12" }).success,
    ).toBe(true);
    expect(
      budgetCopySchema.safeParse({ targetMonth: "2026-13" }).success,
    ).toBe(false);

    expect(
      categoryUpdateSchema.safeParse({ name: "Coffee & Tea", icon: "utensils" })
        .success,
    ).toBe(true);
    expect(categoryUpdateSchema.safeParse({}).success).toBe(false);
  });
});
