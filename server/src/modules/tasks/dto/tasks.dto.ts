import { z } from "zod";

export const CreateTaskDto = z.object({
  title: z.string().min(1).max(300),
  source: z.enum(["email", "slack", "github", "manual", "agent"]).default("manual"),
  sourceRef: z.string().optional(),
  due: z.string().datetime().optional(),
});

export const UpdateTaskDto = z
  .object({
    status: z.enum(["todo", "doing", "done"]).optional(),
    title: z.string().min(1).max(300).optional(),
    due: z.string().datetime().nullable().optional(),
    labelIds: z.array(z.string()).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });
