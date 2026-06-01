// Session helper — stub until Supabase Auth is wired (S0.7 🔒).
// Replace the body of getSession() with the Supabase server-side session call.
export type Session = {
  userId: string;
};

export async function getSession(): Promise<Session | null> {
  return null;
}
