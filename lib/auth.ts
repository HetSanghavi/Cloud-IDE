import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authorizeCredentials } from "@/lib/credential-authorize";
import { prisma } from "@/lib/prisma";
import { applySessionUpdate, applyTokenToSession } from "@/lib/session";

const googleClientId = process.env.AUTH_GOOGLE_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET;
const prismaAdapter = PrismaAdapter(prisma);
const adapter = {
  ...prismaAdapter,
  async createUser(user: Parameters<NonNullable<typeof prismaAdapter.createUser>>[0]) {
    return prismaAdapter.createUser!({
      ...user,
      email: user.email.toLowerCase(),
      emailVerified: new Date(),
      name: user.name?.trim() || user.email.split("@")[0]
    });
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: { strategy: "jwt" },
  pages: { signIn: "/", error: "/" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials, request) {
        return authorizeCredentials(credentials, request);
      }
    }),
    ...(googleClientId && googleClientSecret ? [Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name?.trim() || profile.email.split("@")[0],
          email: profile.email.toLowerCase(),
          image: profile.picture
        };
      }
    })] : [])
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      return Boolean(profile && "email_verified" in profile && profile.email_verified === true);
    },
    jwt({ token, trigger, session }) { return trigger === "update" ? applySessionUpdate(token, session) : token; },
    session({ session, token }) { return applyTokenToSession(session, token); }
  }
});
