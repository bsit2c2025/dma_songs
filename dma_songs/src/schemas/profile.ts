import { z } from "zod";

export const profileFormSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name.").max(120),
  voiceClassificationId: z.string().uuid().nullable(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
