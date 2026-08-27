import { z } from "zod";
import { extractYouTubeId } from "@/lib/youtube";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

export const voiceFamilySchema = z.enum(["soprano", "alto", "tenor", "bass"]);

export const songVideoSchema = z.object({
  id: z.string().uuid().optional(),
  /** Exactly one of these is set; both null means a full-ensemble recording. */
  voiceClassificationId: z.string().uuid().nullable().default(null),
  voiceFamily: voiceFamilySchema.nullable().default(null),
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

    /**
     * "simple" files the song against whole families (SATB); "detailed" against
     * the eight divided parts. Either way the database stores divided parts, so
     * this only decides which editor is shown.
     */
    partMode: z.enum(["simple", "detailed"]).default("detailed"),
    voiceFamilies: z.array(voiceFamilySchema).default([]),
    voiceClassificationIds: z.array(z.string().uuid()).default([]),

    // Copyright provenance. Required before lyrics can be stored.
    rightsConfirmed: z.boolean().default(false),
    rightsBasis: z
      .enum(["public_domain", "owned", "licensed", "permission", "other"])
      .nullable()
      .default(null),
    rightsHolder: optionalText(200),
    rightsNote: optionalText(1000),

    videos: z.array(songVideoSchema).default([]),
  })
  .superRefine((value, ctx) => {
    // At least one part, expressed whichever way this song is filed.
    if (value.partMode === "simple" && value.voiceFamilies.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["voiceFamilies"],
        message: "Pick at least one voice — SATB covers the usual case.",
      });
    }
    if (value.partMode === "detailed" && value.voiceClassificationIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["voiceClassificationIds"],
        message: "Pick at least one voice part.",
      });
    }

    // Storing somebody else's lyrics on our own server is the real copyright
    // exposure here, so it needs an explicit answer rather than a default.
    if (value.lyrics && value.lyrics.trim().length > 0) {
      if (!value.rightsConfirmed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rightsConfirmed"],
          message: "Confirm where these lyrics came from before saving them.",
        });
      }
      if (!value.rightsBasis) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rightsBasis"],
          message: "Say what gives us the right to store these lyrics.",
        });
      }
      if (value.rightsBasis === "other" && !value.rightsNote) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rightsNote"],
          message: "Explain the arrangement, since it isn't one of the listed cases.",
        });
      }
    }

    // One video per target. The database enforces this too; catching it here
    // gives a field-level message instead of a 409.
    const seen = new Set<string>();
    value.videos.forEach((video, index) => {
      const key = video.voiceClassificationId ?? video.voiceFamily ?? "general";
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["videos", index, "voiceClassificationId"],
          message: "There's already a video for this. Edit that one instead.",
        });
      }
      seen.add(key);

      if (video.voiceClassificationId && video.voiceFamily) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["videos", index, "voiceClassificationId"],
          message: "A video is for one part or one voice, not both.",
        });
      }

      if (
        value.partMode === "detailed" &&
        video.voiceClassificationId &&
        !value.voiceClassificationIds.includes(video.voiceClassificationId)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["videos", index, "voiceClassificationId"],
          message: "Add this part to the song first.",
        });
      }

      if (
        value.partMode === "simple" &&
        video.voiceFamily &&
        !value.voiceFamilies.includes(video.voiceFamily)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["videos", index, "voiceClassificationId"],
          message: "Add this voice to the song first.",
        });
      }
    });
  });

export type SongFormValues = z.input<typeof songFormSchema>;
export type SongFormOutput = z.output<typeof songFormSchema>;
