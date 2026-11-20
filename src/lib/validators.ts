import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
  currency: z.enum(["IDR", "USD", "SGD", "EUR"]).default("IDR"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(128),
});

export const walletCreateSchema = z.object({
  name: z.string().trim().min(1, "Wallet name is required").max(40),
  type: z.enum(["CASH", "BANK", "EWALLET", "CREDIT", "SAVINGS"]),
  initialBalance: z.coerce
    .number()
    .finite()
    .min(-999999999999, "Balance out of range")
    .max(999999999999, "Balance out of range"),
});

export const walletUpdateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  type: z.enum(["CASH", "BANK", "EWALLET", "CREDIT", "SAVINGS"]).optional(),
  initialBalance: z.coerce
    .number()
    .finite()
    .min(-999999999999)
    .max(999999999999)
    .optional(),
  isArchived: z.boolean().optional(),
});

export const transactionCreateSchema = z
  .object({
    type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
    amount: z.coerce
      .number()
      .finite()
      .positive("Amount must be greater than 0")
      .max(999999999999, "Amount exceeds maximum limit"),
    walletId: z.string().uuid("Select a valid source wallet"),
    targetWalletId: z.string().uuid().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    note: z.string().trim().max(240).optional().default(""),
    occurredAt: z.string().datetime({ offset: true }).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "TRANSFER") {
      if (!data.targetWalletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targetWalletId"],
          message: "Select a destination wallet for transfers",
        });
      } else if (data.targetWalletId === data.walletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["targetWalletId"],
          message: "Source and destination wallets must be different",
        });
      }
    } else if (!data.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryId"],
        message: "Select a category",
      });
    }
  });

export const budgetUpsertSchema = z.object({
  categoryId: z.string().uuid("Select a valid category"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month format"),
  limitAmount: z.coerce
    .number()
    .finite()
    .positive("Monthly budget limit must be greater than 0")
    .max(999999999999),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(32),
  type: z.enum(["EXPENSE", "INCOME"]),
  icon: z
    .enum([
      "utensils",
      "car",
      "receipt",
      "bag",
      "heart",
      "repeat",
      "home",
      "tag",
      "briefcase",
      "trending",
      "gift",
      "wallet",
    ])
    .default("tag"),
});
