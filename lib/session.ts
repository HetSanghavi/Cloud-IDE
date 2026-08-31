type SessionValues = { name?: string | null; email?: string | null };
type TokenValues = { name?: string | null; email?: string | null };

export function applySessionUpdate(token: TokenValues, session?: SessionValues) {
  if (session?.name) token.name = session.name;
  if (session?.email) token.email = session.email;
  return token;
}

export function applyTokenToSession<T extends { user?: { id?: string; name?: string | null; email?: string | null } }>(session: T, token: TokenValues & { sub?: string | null }) {
  if (session.user) {
    session.user.id = token.sub || "";
    session.user.name = token.name || session.user.name;
    session.user.email = token.email || session.user.email;
  }
  return session;
}
