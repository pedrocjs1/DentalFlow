/**
 * Job Scheduler — BullMQ
 *
 * Registers all recurring jobs with their intervals.
 * Graceful degradation: if Redis is not available, logs a warning and skips.
 * Call registerAllJobs() once at app startup.
 */

import { runPipelineAutomations } from "./pipeline-automations.js";
import { runAppointmentReminders } from "./appointment-reminders.js";
import { runTreatmentFollowup, runPostProcedureChecks } from "./treatment-followup.js";
import { runTrialExpirationCheck } from "./trial-expiration.js";
import { runPostVisitAndAlerts } from "./post-visit-and-alerts.js";

interface JobStatus {
  name: string;
  interval: string;
  lastRun: Date | null;
  nextRun: Date | null;
  runs: number;
  failures: number;
}

// Track job status in memory for the admin endpoint
const jobStatuses: Map<string, JobStatus> = new Map();

function trackJob(name: string, interval: string) {
  jobStatuses.set(name, {
    name,
    interval,
    lastRun: null,
    nextRun: null,
    runs: 0,
    failures: 0,
  });
}

async function runWithTracking(name: string, fn: () => Promise<void>): Promise<void> {
  const status = jobStatuses.get(name);
  try {
    await fn();
    if (status) {
      status.lastRun = new Date();
      status.runs++;
    }
  } catch (err) {
    if (status) {
      status.failures++;
      status.lastRun = new Date();
    }
    console.error(`[scheduler] Job "${name}" failed:`, err);
  }
}

export function getJobStatuses(): JobStatus[] {
  return Array.from(jobStatuses.values());
}

/**
 * Test if Redis is reachable before creating any BullMQ queues.
 * Returns true if connectable, false otherwise.
 */
async function testRedisConnection(redisUrl: string): Promise<boolean> {
  // Use raw TCP to test connectivity (avoid ioredis import issues)
  const { createConnection } = await import("net");

  let host = "localhost";
  let port = 6379;

  try {
    const url = new URL(redisUrl);
    host = url.hostname;
    port = parseInt(url.port) || 6379;
  } catch {
    // keep defaults
  }

  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: 2000 });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export async function registerAllJobs(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("[scheduler] REDIS_URL not set — cron jobs desactivados");
    return;
  }

  // Test Redis connectivity BEFORE creating any BullMQ objects
  const reachable = await testRedisConnection(redisUrl);
  if (!reachable) {
    console.warn(
      "[scheduler] ⚠ Redis no disponible — Cron jobs desactivados. " +
      "Los jobs del pipeline, recordatorios y seguimientos no se ejecutarán hasta que Redis esté corriendo."
    );
    return;
  }

  try {
    const { Queue, Worker } = await import("bullmq");

    // Parse Redis URL for connection config
    let connection: { host: string; port: number; password?: string; maxRetriesPerRequest: null };
    try {
      const url = new URL(redisUrl);
      connection = {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        ...(url.password ? { password: url.password } : {}),
        maxRetriesPerRequest: null, // Required by BullMQ
      };
    } catch {
      connection = { host: "localhost", port: 6379, maxRetriesPerRequest: null };
    }

    // Helper: create a queue + worker pair with error handling
    const createPair = (
      name: string,
      interval: string,
      intervalMs: number,
      fn: () => Promise<void>
    ) => {
      const queue = new Queue(name, { connection });
      // Swallow Redis errors on the queue so they don't crash the process
      queue.on("error", (err) => {
        console.warn(`[scheduler] Queue "${name}" error (non-fatal): ${err.message}`);
      });

      trackJob(name, interval);

      queue.upsertJobScheduler(
        `${name}-scheduler`,
        { every: intervalMs },
        { name: "run" }
      ).catch((err) => {
        console.warn(`[scheduler] Failed to schedule "${name}": ${err.message}`);
      });

      const worker = new Worker(
        name,
        async () => { await runWithTracking(name, fn); },
        { connection }
      );
      // Swallow Redis errors on the worker so they don't crash the process
      worker.on("error", (err) => {
        console.warn(`[scheduler] Worker "${name}" error (non-fatal): ${err.message}`);
      });
    };

    createPair("pipeline-automations", "15 min", 15 * 60 * 1000, runPipelineAutomations);
    createPair("appointment-reminders", "30 min", 30 * 60 * 1000, runAppointmentReminders);
    createPair("treatment-followup", "1 hour", 60 * 60 * 1000, runTreatmentFollowup);
    createPair("post-procedure-check", "1 hour", 60 * 60 * 1000, runPostProcedureChecks);
    createPair("trial-expiration", "1 hour", 60 * 60 * 1000, runTrialExpirationCheck);
    createPair("post-visit-and-alerts", "30 min", 30 * 60 * 1000, runPostVisitAndAlerts);

    console.log("[scheduler] BullMQ jobs registrados:");
    console.log("  - pipeline-automations: cada 15 min");
    console.log("  - appointment-reminders: cada 30 min");
    console.log("  - treatment-followup: cada 1 hora");
    console.log("  - post-procedure-check: cada 1 hora");
    console.log("  - post-visit-and-alerts: cada 30 min");
  } catch (err) {
    console.warn(`[scheduler] Failed to register BullMQ jobs: ${err instanceof Error ? err.message : String(err)}`);
    console.log("[scheduler] El server continuará sin cron jobs");
  }
}
