import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@dentalflow/db";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const campaignQueue = new Queue("campaigns", { connection });
export const reminderQueue = new Queue("reminders", { connection });

interface ReminderJobData {
  appointmentId: string;
  tenantId: string;
  patientPhone: string;
  patientName: string;
  appointmentTime: string;
  clinicName: string;
  phoneNumberId: string;
  accessToken: string;
}

export async function scheduleAppointmentReminder(
  data: ReminderJobData,
  appointmentStartTime: Date
): Promise<void> {
  const reminderTime = new Date(appointmentStartTime);
  reminderTime.setHours(reminderTime.getHours() - 24);

  const delay = Math.max(0, reminderTime.getTime() - Date.now());

  await reminderQueue.add("appointment-reminder", data, {
    delay,
    jobId: `reminder-${data.appointmentId}`,
    removeOnComplete: true,
    removeOnFail: 1000,
  });
}

export async function cancelAppointmentReminder(
  appointmentId: string
): Promise<void> {
  const job = await reminderQueue.getJob(`reminder-${appointmentId}`);
  if (job) {
    await job.remove();
  }
}
