import { z } from "zod";

export const fragranceInputSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.string().trim().min(1),
});

export const fragranceUpdateSchema = fragranceInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required for update."
);
