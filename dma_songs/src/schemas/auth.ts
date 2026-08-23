import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().min(1, "Enter your email.").email("That email doesn't look right."),
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().min(1, "Enter your email.").email("That email doesn't look right."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Passwords can be at most 72 characters.")
    .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
      message: "Mix letters and numbers.",
    }),
  voiceClassificationId: z.string().uuid().nullable().default(null),
});

export const resetRequestSchema = z.object({
  email: z.string().trim().min(1, "Enter your email.").email("That email doesn't look right."),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters.").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "The two passwords don't match.",
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.input<typeof signUpSchema>;
export type ResetRequestValues = z.infer<typeof resetRequestSchema>;
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
