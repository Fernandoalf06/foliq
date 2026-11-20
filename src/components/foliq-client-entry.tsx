"use client";

import React, { useState } from "react";
import { AuthScreen } from "./auth-screen";
import { FoliqApp } from "./foliq-app";

interface FoliqClientEntryProps {
  initialAuthenticated: boolean;
  initialHasOwnerAccount: boolean;
  ownerConfigured: boolean;
}

export function FoliqClientEntry({
  initialAuthenticated,
  initialHasOwnerAccount,
  ownerConfigured,
}: FoliqClientEntryProps) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [hasOwnerAccount, setHasOwnerAccount] = useState(
    initialHasOwnerAccount,
  );

  if (!authenticated) {
    return (
      <AuthScreen
        hasOwnerAccount={hasOwnerAccount}
        ownerConfigured={ownerConfigured}
        onAuthenticated={() => {
          setHasOwnerAccount(true);
          setAuthenticated(true);
        }}
      />
    );
  }

  return (
    <FoliqApp
      onSignedOut={() => {
        setAuthenticated(false);
      }}
    />
  );
}
