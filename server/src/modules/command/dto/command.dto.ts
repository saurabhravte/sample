/** Command (agent) DTOs. */
export { CommandRequest } from "@momentum/shared";

import { z } from "zod";

export const Decision = z.enum(["approve", "reject"]);
