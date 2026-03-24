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

export async function registerAllJobs(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("[scheduler] REDIS_URL not set — all cron jobs skipped (running without Redis)");
    return;
  }

  try {
    const { Queue, Worker } = await import("bullmq");

    // Parse Redis URL for connection
    let connection: { host: string; port: number; password?: string };
    try {
      const url = new URL(redisUrl);
      connection = {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        ...(url.password ? { password: url.password } : {}),
      };
    } catch {
      // Fallback for simple redis://localhost:6379
      connection = { host: "localhost", port: 6379 };
    }

    // ─── Pipeline Auto-Message & Auto-Move (every 15 min) ─────────────────────
    const pipelineQueue = new Queue("pipeline-automations", { connection });
    trackJob("pipeline-automations", "15 min");

    await pipelineQueue.upsertJobScheduler(
      "pipeline-automations-scheduler",
      { every: 15 * 60 * 1000 },
      { name: "run" }
    );

    new Worker(
      "pipeline-automations",
      async () => {
        await runWithTracking("pipeline-automations", runPipelineAutomations);
      },
      { connection }
    );

    // ─── Appointment Reminders (every 30 min) ─────────────────────────────────
    const reminderQueue = new Queue("appointment-reminders", { connection });
    trackJob("appointment-reminders", "30 min");

    await reminderQueue.upsertJobScheduler(
      "appointment-reminders-scheduler",
      { every: 30 * 60 * 1000 },
      { name: "run" }
    );

    new Worker(
      "appointment-reminders",
      async () => {
        await runWithTracking("appointment-reminders", runAppointmentReminders);
      },
      { connection }
    );

    // ─── Treatment Follow-up (every 1 hour) ───────────────────────────────────
    const followUpQueue = new Queue("treatment-followup", { connection });
    trackJob("treatment-followup", "1 hour");

    await followUpQueue.upsertJobScheduler(
      "treatment-followup-scheduler",
      { every: 60 * 60 * 1000 },
      { name: "run" }
    );

    new Worker(
      "treatment-followup",
      async () => {
        await runWithTracking("treatment-followup", runTreatmentFollowup);
      },
      { connection }
    );

    // ─── Post-Procedure Check (every 1 hour) ──────────────────────────────────
    const postCheckQueue = new Queue("post-procedure-check", { connection });
    trackJob("post-procedure-check", "1 hour");

    await postCheckQueue.upsertJobScheduler(
      "post-procedure-check-scheduler",
      { every: 60 * 60 * 1000 },
      { name: "run" }
    );

    new Worker(
      "post-procedure-check",
      async () => {
        await runWithTracking("post-procedure-check", runPostProcedureChecks);
      },
      { connection }
    );

    console.log("[scheduler] All BullMQ jobs registered:");
    console.log("  - pipeline-automations: every 15 min");
    console.log("  - appointment-reminders: every 30 min");
    console.log("  - treatment-followup: every 1 hour");
    console.log("  - post-procedure-check: every 1 hour");
  } catch (err) {
    console.warn("[scheduler] Failed to register BullMQ jobs (Redis might be down):", err);
    console.log("[scheduler] Server will continue without cron jobs");
  }
}
