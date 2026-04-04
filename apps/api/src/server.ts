import { buildApp, validateAnthropicKey } from "./app.js";
import { registerAllJobs } from "./jobs/scheduler.js";

const PORT = parseInt(process.env.PORT ?? "3001");
const HOST = process.env.HOST ?? "0.0.0.0";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`API running at http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Validate Anthropic API key (non-blocking)
  validateAnthropicKey().catch(() => {});

  // Register BullMQ cron jobs AFTER server is listening.
  // This is intentionally outside the try-catch above so a Redis
  // failure never kills the server.
  await registerAllJobs();
}

start();
