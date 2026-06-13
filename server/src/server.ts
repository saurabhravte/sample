/**
 * Server entry: a pure node:http server with the Express app as its handler,
 * per the project requirement ("make server using pure node:http and use
 * express to create the app").
 */
import http from "node:http";
import { createApp } from "./app";
import { env } from "./common/config/env";
import { startWorkers } from "./common/jobs/workers";

const app = createApp();
const server = http.createServer(app);

server.listen(env.API_PORT, async () => {
  console.log(`[momentum-server] node:http listening on :${env.API_PORT}`);
  try {
    await startWorkers();
    console.log("[momentum-server] pg-boss workers started");
  } catch (e) {
    console.error("[momentum-server] pg-boss failed to start:", (e as Error).message);
  }
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.log(`[momentum-server] ${sig} — draining`);
    server.close(() => process.exit(0));
  });
}
