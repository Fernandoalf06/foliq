import { describe, expect, it } from "vitest";
import {
  passwordChangeSchema,
  profileUpdateSchema,
  transactionCreateSchema,
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
});
