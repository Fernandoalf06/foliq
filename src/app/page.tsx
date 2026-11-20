import React from "react";
import { FoliqClientEntry } from "@/components/foliq-client-entry";
import { getAllowedOwnerEmail, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let authenticated = false;
  let hasOwnerAccount = false;
  const ownerConfigured = Boolean(getAllowedOwnerEmail());

  try {
    const [user, userCount] = await Promise.all([
      getCurrentUser(),
      prisma.user.count(),
    ]);
    authenticated = Boolean(user);
    hasOwnerAccount = userCount > 0;
  } catch (error) {
    console.error("Initial session check error:", error);
  }

  return (
    <FoliqClientEntry
      initialAuthenticated={authenticated}
      initialHasOwnerAccount={hasOwnerAccount}
      ownerConfigured={ownerConfigured}
    />
  );
}
