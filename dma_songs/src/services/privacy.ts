import { supabase } from "@/lib/supabase";

/** Everything the system holds about the signed-in member, as JSON. */
export async function exportMyData(): Promise<unknown> {
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) throw error;
  return data;
}

/**
 * Strips the member's personal data and deactivates the account.
 *
 * The sign-in record itself stays: deleting it needs the service-role key,
 * which would have to live in the browser bundle to be reachable from here,
 * and that key bypasses every access rule in the database. Removing the
 * personal data is what an erasure request under the Data Privacy Act
 * actually asks for.
 */
export async function eraseMyAccount() {
  const { error } = await supabase.rpc("erase_my_account");
  if (error) throw error;
}

export async function anonymizeMember(userId: string) {
  const { error } = await supabase.rpc("admin_anonymize_member", { p_user_id: userId });
  if (error) throw error;
}

/**
 * Sends the member a password reset link.
 *
 * Administrators cannot set somebody else's password directly, and that is
 * deliberate rather than a limitation: an administrator who can silently set
 * a member's password can also sign in as them, and nothing in the audit log
 * would show the difference.
 */
export async function sendPasswordReset(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function getMemberNote(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("member_notes")
    .select("note")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.note ?? "";
}

export async function saveMemberNote(userId: string, note: string, actorId: string) {
  const { error } = await supabase
    .from("member_notes")
    .upsert({ user_id: userId, note, updated_by: actorId }, { onConflict: "user_id" });
  if (error) throw error;
}
