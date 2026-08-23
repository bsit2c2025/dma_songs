/**
 * Environment access in one place.
 *
 * Missing configuration produces a readable setup screen (see main.tsx)
 * instead of an unexplained 401 from Supabase halfway through a page. Only
 * VITE_-prefixed values exist in the bundle; nothing secret belongs here.
 */
function read(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value || String(value).startsWith("your-")) return "";
  return String(value);
}

const supabaseUrl = read("VITE_SUPABASE_URL");
const supabasePublishableKey = read("VITE_SUPABASE_PUBLISHABLE_KEY");

export const missingEnv = [
  supabaseUrl ? null : "VITE_SUPABASE_URL",
  supabasePublishableKey ? null : "VITE_SUPABASE_PUBLISHABLE_KEY",
].filter((name): name is string => Boolean(name));

export const env = {
  // The placeholders keep createClient() from throwing before the setup
  // screen can explain what is missing.
  supabaseUrl: supabaseUrl || "https://placeholder.supabase.co",
  supabasePublishableKey: supabasePublishableKey || "placeholder-key",
  siteUrl: read("VITE_SITE_URL") || window.location.origin,
  isDev: import.meta.env.DEV,
};
