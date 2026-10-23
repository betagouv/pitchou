import type {
  NotificationFilters,
  NotificationHistoryRow,
  NotificationRow,
} from "./emailNotifications.ts";

export type EmailSource = "notification" | "cnpn";
export type EmailFilters = Omit<NotificationFilters, "notification"> & {
  source: string;
  tracking: string;
  sort: "due_at" | "sent_at" | "created_at" | "dossier" | "email";
  order: "asc" | "desc";
  email: string;
};
export type EmailRow = Omit<NotificationRow, "personne" | "attempt_count"> & {
  source: EmailSource;
  personne: number | null;
  attempt_count: number | null;
  subject: string | null;
  delivered_at: Date | string | null;
  opened_at: Date | string | null;
};
export type EmailDetail = {
  row: EmailRow;
  history: NotificationHistoryRow[];
  html: string | null;
  recipients: string[];
  cc: string[];
  sentBy: string | null;
  attachments: { id: string | null; name: string }[];
  firstAttemptAt: Date | string | null;
  readReceiptSentAt: Date | string | null;
};
export type EmailOverview = {
  rows: EmailRow[];
  total: number;
  page: number;
  counts: { kind: string; status: string; count: number }[];
  cnpn: { received: number; opened: number };
  detail: EmailDetail | null;
};
