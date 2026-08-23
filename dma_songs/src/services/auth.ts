import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(params: {
  email: string;
  password: string;
  displayName: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      // Read by the handle_new_user() trigger to fill in the profile.
      data: { display_name: params.displayName },
      emailRedirectTo: `${env.siteUrl}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle(redirectPath = "/") {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
