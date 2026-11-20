import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth";
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from "../src/lib/defaults";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run seed.");
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log(
        "Seed skipped: database already contains a user account. Seed never overwrites existing data.",
      );
      return;
    }

    const demoEmail =
      process.env.OWNER_EMAIL?.trim().toLowerCase() || "demo@foliq.local";

    const user = await prisma.user.create({
      data: {
        email: demoEmail,
        name: "Foliq Demo Owner",
        passwordHash: hashPassword("demo-password-change-me"),
        currency: "IDR",
      },
    });

    const wallets = await Promise.all(
      DEFAULT_WALLETS.map((w, idx) =>
        prisma.wallet.create({
          data: {
            userId: user.id,
            name: w.name,
            type: w.type,
            initialBalance: idx === 0 ? 5000000 : idx === 1 ? 500000 : 250000,
            currency: "IDR",
          },
        }),
      ),
    );

    const categories = await Promise.all(
      DEFAULT_CATEGORIES.map((c) =>
        prisma.category.create({
          data: {
            userId: user.id,
            name: c.name,
            type: c.type,
            icon: c.icon,
            isDefault: true,
          },
        }),
      ),
    );

    const food = categories.find((c) => c.name === "Food & Dining");
    const salary = categories.find((c) => c.name === "Salary");
    const now = new Date();

    if (salary) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "INCOME",
          amount: 10000000,
          walletId: wallets[0].id,
          categoryId: salary.id,
          note: "Sample monthly salary",
          occurredAt: new Date(now.getFullYear(), now.getMonth(), 1, 9, 0),
        },
      });
    }

    if (food) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "EXPENSE",
          amount: 45000,
          walletId: wallets[1].id,
          categoryId: food.id,
          note: "Sample coffee and lunch",
          occurredAt: now,
        },
      });

      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      await prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: food.id,
          month,
          limitAmount: 2000000,
        },
      });
    }

    console.log(`Seeded fictional demo data for ${demoEmail}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
