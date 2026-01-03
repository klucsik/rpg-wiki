import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [
    genericOAuthClient(),
  ],
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  $Infer,
} = authClient;

// Re-export types for convenience
export type Session = typeof $Infer.Session;
