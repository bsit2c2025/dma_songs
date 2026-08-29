import { z } from "zod";
import { containsUnsafeMarkup, sanitizeRichText } from "@/lib/sanitize";
import { stripHtml } from "@/lib/utils";

export const announcementFormSchema = z
  .object({
    title: z.string().trim().min(1, "Give the announcement a title.").max(160),
    content: z
      .string()
      .trim()
      .min(1, "Write the announcement.")
      .max(20000, "That's too long — keep it under 20,000 characters.")
      .refine((v) => stripHtml(v, 10_000).length > 0, "Write the announcement.")
      .refine((v) => !containsUnsafeMarkup(v), {
        message: "Some formatting isn't allowed and was removed. Review the text and save again.",
      })
      .transform(sanitizeRichText),
    imageUrl: z
      .string()
      .trim()
      .url("Use a full https:// address.")
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    linkUrl: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^(https?:\/\/|\/)/.test(v), {
        message: "Links must start with https:// or /.",
      }),
    linkLabel: z
      .string()
      .trim()
      .max(60)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : null)),
    isPublished: z.boolean().default(false),
    isPinned: z.boolean().default(false),
    priority: z.coerce.number().int().min(0).max(100).default(0),
    startsAt: z.string().nullable().default(null),
    endsAt: z.string().nullable().default(null),

    // Event details. An event is an announcement with a date, a place and a
    // costume — not a separate kind of record, because a rehearsal call and a
    // concert call are the same message to the same people.
    isEvent: z.boolean().default(false),
    eventStartsAt: z.string().nullable().default(null),
    eventEndsAt: z.string().nullable().default(null),
    callTime: z.string().trim().max(60).optional().transform((v) => (v && v.length ? v : null)),
    venue: z.string().trim().max(200).optional().transform((v) => (v && v.length ? v : null)),
    address: z.string().trim().max(400).optional().transform((v) => (v && v.length ? v : null)),
    dressCode: z.string().trim().max(300).optional().transform((v) => (v && v.length ? v : null)),
    whatToBring: z.string().trim().max(400).optional().transform((v) => (v && v.length ? v : null)),
    collectRsvp: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.isEvent && !value.eventStartsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eventStartsAt"],
        message: "An event needs a date and time — that's the point of it.",
      });
    }
    if (
      value.eventStartsAt &&
      value.eventEndsAt &&
      new Date(value.eventEndsAt) < new Date(value.eventStartsAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eventEndsAt"],
        message: "The event can't finish before it starts.",
      });
    }
    if (value.linkLabel && !value.linkUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["linkUrl"],
        message: "Add the link address the button should open.",
      });
    }
    if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "The end time has to be after the start time.",
      });
    }
  });

export type AnnouncementFormValues = z.input<typeof announcementFormSchema>;
export type AnnouncementFormOutput = z.output<typeof announcementFormSchema>;
