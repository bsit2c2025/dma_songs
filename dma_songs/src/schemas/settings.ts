import { z } from "zod";

export const settingsFormSchema = z.object({
  appName: z.string().trim().min(1, "The application needs a name.").max(80),
  tagline: z.string().trim().max(120).optional().or(z.literal("")),
  organization: z.string().trim().max(120).optional().or(z.literal("")),
  logoUrl: z.string().trim().max(500).optional().or(z.literal("")),
  contactEmail: z
    .string()
    .trim()
    .email("That email doesn't look right.")
    .optional()
    .or(z.literal("")),
  songsPageSize: z.coerce.number().int().min(6).max(48),
  announcementsHomeLimit: z.coerce.number().int().min(1).max(10),
  showAnnouncementBanner: z.boolean(),
  legalEntityName: z.string().trim().max(200).optional().transform((v) => v ?? ""),
  legalContactEmail: z
    .string()
    .trim()
    .email("Use a valid email address.")
    .optional()
    .or(z.literal(""))
    .transform((v) => v ?? ""),
  legalDpoName: z.string().trim().max(200).optional().transform((v) => v ?? ""),
  legalAddress: z.string().trim().max(500).optional().transform((v) => v ?? ""),
  legalEffectiveDate: z.string().trim().max(60).optional().transform((v) => v ?? ""),
  legalTermsVersion: z.string().trim().max(20).optional().transform((v) => v ?? ""),
});

export type SettingsFormValues = z.input<typeof settingsFormSchema>;
export type SettingsFormOutput = z.output<typeof settingsFormSchema>;
