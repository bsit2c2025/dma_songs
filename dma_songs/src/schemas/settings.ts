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
});

export type SettingsFormValues = z.input<typeof settingsFormSchema>;
export type SettingsFormOutput = z.output<typeof settingsFormSchema>;
