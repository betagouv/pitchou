export const NOTIFICATION_KINDS = ["arrival", "assignment", "novelty"] as const;
export const NOTIFICATION_STATUSES = [
  "pending",
  "sent",
  "cancelled",
  "uncertain",
  "suppressed",
] as const;
export const NOTIFICATION_ENVIRONMENTS = [
  "production",
  "staging",
  "development",
  "test",
  "preview",
] as const;
export type NotificationFilters = {
  search: string;
  kind: string;
  status: string;
  environment: string;
  dateFrom: string;
  dateTo: string;
  dateField: "due_at" | "sent_at" | "created_at";
  overdue: boolean;
  page: number;
  notification: string;
};
export type NotificationRow = {
  id: string;
  kind: string;
  status: string;
  environment: string;
  dossier: number;
  dossier_name: string | null;
  personne: number;
  first_names: string | null;
  last_name: string | null;
  email: string | null;
  due_at: Date | string;
  sent_at: Date | string | null;
  created_at: Date | string;
  retry_at: Date | string | null;
  attempt_count: number;
  last_error: string | null;
  cancellation_reason: string | null;
  provider_message_id: string | null;
};
export type NotificationHistoryRow = {
  id: string;
  notification_id: string;
  event: string;
  environment: string;
  occurred_at: Date | string;
  attempt: number;
  details: Record<string, unknown>;
};
export type NotificationOverview = {
  rows: NotificationRow[];
  total: number;
  counts: { kind: string; status: string; count: number }[];
  history: NotificationHistoryRow[];
};
