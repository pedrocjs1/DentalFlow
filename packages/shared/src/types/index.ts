export type Intent =
  | "BOOK_APPOINTMENT"
  | "CANCEL_APPOINTMENT"
  | "RESCHEDULE_APPOINTMENT"
  | "CHECK_APPOINTMENT"
  | "FAQ"
  | "TALK_TO_HUMAN"
  | "GREETING"
  | "OTHER";

export interface TenantContext {
  tenantId: string;
  userId: string;
  userRole: string;
}


export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  dentistId: string;
  dentistName: string;
}
