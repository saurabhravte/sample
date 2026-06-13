import { z } from "zod";

export const CreateLabelDto = z.object({
  name: z.string().min(1).max(40),
  color: z.string().min(1).max(64),
});
