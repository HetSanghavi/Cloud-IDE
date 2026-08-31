import { z } from "zod";

export function accountValidationMessage(error: z.ZodError) {
  const fields = error.flatten().fieldErrors;
  if (fields.email?.length) return "Please enter a valid email address.";
  if (fields.name?.length) return "Please enter a username between 2 and 60 characters.";
  if (fields.password?.length) return "Password must be between 8 and 72 characters.";
  return "Please check your account details and try again.";
}

export const templateSchema = z.enum(["blank", "portfolio", "landing", "app"]);
export const visibilitySchema = z.enum(["private", "public"]);
export const projectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  template: templateSchema,
  visibility: visibilitySchema.default("private"),
  color: z.string().trim().min(1).max(24).default("violet")
});
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: z.string().min(8).max(72)
});
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase())
});
type InputFile = { id?: string; name: string; kind: "file" | "folder"; content?: string; children?: InputFile[] };

export const projectFileSchema: z.ZodType<InputFile> = z.lazy(() => z.object({
  id: z.string().min(1).max(64).optional(),
  name: z.string().trim().min(1).max(100),
  kind: z.enum(["file", "folder"]),
  content: z.string().max(2_000_000).optional(),
  children: z.array(projectFileSchema).max(250).optional()
}));
export const workspaceSchema = projectSchema.extend({ revision: z.number().int().min(1), files: z.array(projectFileSchema).max(250) });
