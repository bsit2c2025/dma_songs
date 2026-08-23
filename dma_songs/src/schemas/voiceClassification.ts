import { z } from "zod";

export const voiceClassificationFormSchema = z.object({
  name: z.string().trim().min(1, "Name the voice part.").max(60),
  shortCode: z
    .string()
    .trim()
    .max(6, "Keep the code to 6 characters.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex colour like #262C6B."),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean().default(true),
});

export type VoiceClassificationFormValues = z.input<typeof voiceClassificationFormSchema>;
export type VoiceClassificationFormOutput = z.output<typeof voiceClassificationFormSchema>;
