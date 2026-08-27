import { supabase } from "@/lib/supabase";
import type { AppSetting, SettingsMap } from "@/types/models";
import type { Json } from "@/types/database";

export async function loadSettings(): Promise<SettingsMap> {
  const { data, error } = await supabase.from("app_settings").select("*").returns<AppSetting[]>();
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

/**
 * Writes settings, treating a cleared field as an empty value rather than a
 * missing one.
 *
 * `app_settings.value` is `jsonb not null`. PostgREST maps a JSON null onto a
 * SQL NULL for a jsonb column, so sending `null` for a field the admin left
 * blank fails the not-null constraint — and because the whole form is one
 * upsert, a blank tagline would take the logo change down with it. Empty
 * fields are stored as an empty JSON string instead, which `settingString`
 * already falls back on.
 */
export async function saveSettings(entries: Record<string, Json | null | undefined>) {
  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value: (value ?? "") as Json,
    // Everything written from the settings form is rendered somewhere a
    // signed-out visitor can see: the header, the footer, the legal pages.
    is_public: true,
  }));

  const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}

export function settingString(settings: SettingsMap | undefined, key: string, fallback: string) {
  const value = settings?.[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function settingNumber(settings: SettingsMap | undefined, key: string, fallback: number) {
  const value = settings?.[key];
  return typeof value === "number" ? value : fallback;
}

export function settingBoolean(settings: SettingsMap | undefined, key: string, fallback: boolean) {
  const value = settings?.[key];
  return typeof value === "boolean" ? value : fallback;
}
