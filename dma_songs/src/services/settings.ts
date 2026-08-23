import { supabase } from "@/lib/supabase";
import type { AppSetting, SettingsMap } from "@/types/models";
import type { Json } from "@/types/database";

export async function loadSettings(): Promise<SettingsMap> {
  const { data, error } = await supabase.from("app_settings").select("*").returns<AppSetting[]>();
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

export async function saveSettings(entries: Record<string, Json>) {
  const rows = Object.entries(entries).map(([key, value]) => ({ key, value, is_public: true }));
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
