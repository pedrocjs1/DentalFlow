import { buildApp } from "./app.js";
import { registerAllJobs } from "./jobs/scheduler.js";

const PORT = parseInt(process.env.PORT ?? "3001");
const HOST = process.env.HOST ?? "0.0.0.0";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`API running at http://${HOST}:${PORT}`);

    // Register BullMQ cron jobs (graceful — won't crash if Redis is down)
    await registerAllJobs();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
