import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

// Use the current hostname - we're always calling our own API
const baseURL = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
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
