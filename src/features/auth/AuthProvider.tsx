"use client";

import { ReactNode } from "react";

// Better Auth doesn't need a provider wrapper like NextAuth
// The session is managed via cookies and API calls
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
