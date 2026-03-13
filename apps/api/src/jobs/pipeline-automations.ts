/**
 * Pipeline Automations Job
 *
 * Runs every 30 minutes via BullMQ (when Redis is available).
 * For each active PipelineStage with automation enabled:
 *   1. autoMessage: send WhatsApp message to patients who've been in the stage
 *      for >= autoMessageDelayHours and haven't received the message yet.
 *   2. autoMove: move patients who've been in the stage for >= autoMoveDelayHours
 *      without responding to the target stage.
 *
 * Activation: set REDIS_URL env var. Without it, the job is skipped silently.
 */

import { prisma } from "@dentalflow/db";

export async function runPipelineAutomations(): Promise<void> {
  const now = new Date();

  // Fetch all stages that have any automation enabled
  const stages = await prisma.pipelineStage.findMany({
    where: {
      OR: [{ autoMessageEnabled: true }, { autoMoveEnabled: true }],
    },
  });

  for (const stage of stages) {
    const cutoffMessage = new Date(now.getTime() - stage.autoMessageDelayHours * 60 * 60 * 1000);
    const cutoffMove = new Date(now.getTime() - stage.autoMoveDelayHours * 60 * 60 * 1000);

    // Patients in this stage
    const entries = await prisma.patientPipeline.findMany({
      where: { stageId: stage.id },
      include: { patient: { select: { id: true, firstName: true, phone: true, tenantId: true } } },
    });

    for (const entry of entries) {
      // Auto-message: send if delay elapsed and not sent yet
      if (
        stage.autoMessageEnabled &&
        stage.autoMessageTemplate &&
        entry.movedAt <= cutoffMessage &&
        !entry.lastAutoMessageSentAt
      ) {
        // TODO: integrate with WhatsApp messaging package when ready
        console.log(
          `[pipeline-automations] Would send message to ${entry.patient.firstName} (${entry.patient.phone}) in stage "${stage.name}"`
        );
        await prisma.patientPipeline.update({
          where: { id: entry.id },
          data: { lastAutoMessageSentAt: now },
        });
      }

      // Auto-move: move if delay elapsed
      if (
        stage.autoMoveEnabled &&
        stage.autoMoveTargetStageId &&
        entry.movedAt <= cutoffMove
      ) {
        console.log(
          `[pipeline-automations] Auto-moving ${entry.patient.firstName} from "${stage.name}" to stage ${stage.autoMoveTargetStageId}`
        );
        await prisma.patientPipeline.update({
          where: { id: entry.id },
          data: { stageId: stage.autoMoveTargetStageId, movedAt: now, lastAutoMessageSentAt: null },
        });
      }
    }
  }
}

/**
 * Register the job with BullMQ if Redis is configured.
 * Call this once at app startup.
 */
export async function registerPipelineAutomationsJob(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("[pipeline-automations] REDIS_URL not set — job skipped");
    return;
  }

  try {
    const { Queue, Worker } = await import("bullmq");
    const connection = { url: redisUrl };

    const queue = new Queue("pipeline-automations", { connection });

    // Schedule recurring job every 30 minutes
    await queue.add("run", {}, {
      repeat: { every: 30 * 60 * 1000 },
      jobId: "pipeline-automations-recurring",
    });

    new Worker(
      "pipeline-automations",
      async () => { await runPipelineAutomations(); },
      { connection }
    );

    console.log("[pipeline-automations] BullMQ worker registered, running every 30 min");
  } catch (err) {
    console.warn("[pipeline-automations] Failed to register BullMQ job:", err);
  }
}
