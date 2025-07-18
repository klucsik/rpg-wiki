import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      groups: string[];
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    username: string;
    groups: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    username: string;
    groups: string[];
    userId: string;
  }
}
