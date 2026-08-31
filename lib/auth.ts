import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authorizeCredentials } from "@/lib/credential-authorize";
import { applySessionUpdate, applyTokenToSession } from "@/lib/session";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  providers: [Credentials({
    name: "Email and password",
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    async authorize(credentials, request) {
      return authorizeCredentials(credentials, request);
    }
  })],
  callbacks: {
    jwt({ token, trigger, session }) { return trigger === "update" ? applySessionUpdate(token, session) : token; },
    session({ session, token }) { return applyTokenToSession(session, token); }
  }
});
