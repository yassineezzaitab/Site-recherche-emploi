import { z } from "zod";

// A real password policy: minimum length + at least one letter and one digit.
// We deliberately don't force arcane symbol rules (NIST guidance) but do
// enforce a meaningful minimum length.
const passwordSchema = z
  .string()
  .min(10, "Le mot de passe doit contenir au moins 10 caractères")
  .max(128)
  .regex(/[a-zA-Z]/, "Le mot de passe doit contenir au moins une lettre")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  consent: z.literal(true, {
    errorMap: () => ({
      message: "Vous devez accepter la politique de confidentialité",
    }),
  }),
  marketingOptIn: z.boolean().optional().default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;
