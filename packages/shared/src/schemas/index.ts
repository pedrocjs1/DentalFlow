import { z } from "zod";

export const CreatePatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone format"),
  email: z.string().email().optional(),
  birthdate: z.string().datetime().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
});

export const CreateAppointmentSchema = z.object({
  patientId: z.string().cuid(),
  dentistId: z.string().cuid(),
  chairId: z.string().cuid().optional(),
  treatmentTypeId: z.string().cuid().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  source: z
    .enum(["MANUAL", "CHATBOT", "ONLINE", "PHONE", "DENTALINK"])
    .optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
