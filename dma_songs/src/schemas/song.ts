import { z } from "zod";
import { extractYouTubeId } from "@/lib/youtube";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

export const songVideoSchema = z.object({
  id: z.string().uuid().optional(),
  voiceClassificationId: z
    .string()
    .uuid()
    .nullable()
    .default(null)
    .describe("null = a general video for the whole ensemble"),
  url: z
    .string()
    .trim()
    .min(1, "Paste a YouTube link.")
    .refine((v) => extractYouTubeId(v) !== null, {
      message: "That isn't a YouTube link. Use a youtube.com or youtu.be address.",
    }),
  label: optionalText(120),
});

export const songFormSchema = z
  .object({
    title: z.string().trim().min(1, "Give the song a title.").max(200),
    composer: optionalText(160),
    arranger: optionalText(160),
    description: optionalText(2000),
    category: optionalText(80),
    lyrics: optionalText(20000),
    notes: optionalText(5000),
    thumbnailUrl: z
      .string()
      .trim()
      .url("Use a full https:// address.")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    status: z.enum(["active", "disabled"]).default("active"),
    voiceClassificationIds: z
      .array(z.string().uuid())
      .min(1, "Pick at least one voice part."),
    videos: z.array(songVideoSchema).default([]),
  })
  .superRefine((value, ctx) => {
    // One video per part: the database enforces this too, but catching it here
    // gives the admin a field-level message instead of a 409.
    const seen = new Set<string>();
    value.videos.forEach((video, index) => {
      const key = video.voiceClassificationId ?? "general";
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["videos", index, "voiceClassificationId"],
          message: "There's already a video for this part. Edit that one instead.",
        });
      }
      seen.add(key);

      if (
        video.voiceClassificationId &&
        !value.voiceClassificationIds.includes(video.voiceClassificationId)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["videos", index, "voiceClassificationId"],
          message: "Add this part to the song first.",
        });
      }
    });
  });

export type SongFormValues = z.input<typeof songFormSchema>;
export type SongFormOutput = z.output<typeof songFormSchema>;
