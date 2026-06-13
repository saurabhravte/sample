/** Connections DTOs. */
export { Provider } from "@momentum/shared";

import { z } from "zod";

export const ConnectDto = z.object({ apiKey: z.string().min(8).max(512).optional() });
export const OAuthCallbackQuery = z.object({ code: z.string().min(1), state: z.string().min(1) });
