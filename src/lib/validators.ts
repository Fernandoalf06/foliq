import { z } from "zod";

export const uuidSchema = z.string().uuid("Invalid identifier");

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
  currency: z.enum(["IDR", "USD", "SGD", "EUR"]).optional(),
  initialBalance: z.coerce
    .number()
    .finite()
    .min(-999999999999, "Balance out of range")
    .max(999999999999, "Balance out of range"),
});

export const walletUpdateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  type: z.enum(["CASH", "BANK", "EWALLET", "CREDIT", "SAVINGS"]).optional(),
  currency: z.enum(["IDR", "USD", "SGD", "EUR"]).optional(),
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

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  currency: z.enum(["IDR", "USD", "SGD", "EUR"]),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your new password").max(128),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "New password and confirmation do not match",
      });
    }
    if (data.newPassword === data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "New password must be different from your current password",
      });
    }
  });

export const recurringRuleCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(60),
  type: z.enum(["EXPENSE", "INCOME"]),
  amount: z.coerce
    .number()
    .finite()
    .positive("Amount must be greater than 0")
    .max(999999999999, "Amount exceeds maximum limit"),
  walletId: z.string().uuid("Select a valid wallet"),
  categoryId: z.string().uuid("Select a valid category"),
  cadence: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  nextDueDate: z.string().datetime({ offset: true }),
  note: z.string().trim().max(240).optional().default(""),
});

export const recurringRuleUpdateSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  amount: z.coerce.number().finite().positive().max(999999999999).optional(),
  cadence: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  nextDueDate: z.string().datetime({ offset: true }).optional(),
  isActive: z.boolean().optional(),
  note: z.string().trim().max(240).optional(),
});

export const apiTokenCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Token name must be at least 2 characters")
    .max(50),
});

export const shortcutRecordSchema = z.object({
  amount: z.coerce
    .number()
    .finite()
    .positive("Amount must be greater than 0")
    .max(999999999999, "Amount exceeds maximum limit"),
  type: z.enum(["EXPENSE", "INCOME"]).optional().default("EXPENSE"),
  wallet: z.string().trim().max(60).optional(),
  category: z.string().trim().max(60).optional(),
  note: z.string().trim().max(240).optional().default(""),
  occurredAt: z.string().datetime({ offset: true }).optional(),
});

export const savingsGoalCreateSchema = z.object({
  name: z.string().trim().min(1, "Goal name is required").max(60),
  targetAmount: z.coerce
    .number()
    .finite()
    .positive("Target amount must be greater than 0")
    .max(999999999999, "Target amount exceeds maximum limit"),
  currentAmount: z.coerce
    .number()
    .finite()
    .min(0, "Current saved amount cannot be negative")
    .max(999999999999)
    .optional()
    .default(0),
  currency: z.enum(["IDR", "USD", "SGD", "EUR"]).optional(),
  targetDate: z.string().datetime({ offset: true }).nullable().optional(),
  walletId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(240).optional().default(""),
});

export const savingsGoalUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  targetAmount: z.coerce.number().finite().positive().max(999999999999).optional(),
  currentAmount: z.coerce.number().finite().min(0).max(999999999999).optional(),
  deltaAmount: z.coerce
    .number()
    .finite()
    .min(-999999999999)
    .max(999999999999)
    .optional(),
  currency: z.enum(["IDR", "USD", "SGD", "EUR"]).optional(),
  targetDate: z.string().datetime({ offset: true }).nullable().optional(),
  walletId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(240).optional(),
  isCompleted: z.boolean().optional(),
});

export const exchangeRateUpsertSchema = z
  .object({
    fromCurrency: z.enum(["IDR", "USD", "SGD", "EUR"]),
    toCurrency: z.enum(["IDR", "USD", "SGD", "EUR"]),
    rate: z.coerce
      .number()
      .finite()
      .positive("Exchange rate must be greater than 0")
      .max(1000000000, "Exchange rate out of range"),
  })
  .superRefine((data, ctx) => {
    if (data.fromCurrency === data.toCurrency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toCurrency"],
        message: "Source and target currencies must be different",
      });
    }
  });
