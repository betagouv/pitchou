import type { EmailFilters } from "@pitchou/types/adminEmails.ts";

export function defaultEmailFilters(): EmailFilters {
  return {
    search: "",
    source: "",
    kind: "",
    status: "",
    environment: "",
    tracking: "",
    dateFrom: "",
    dateTo: "",
    dateField: "due_at",
    sort: "due_at",
    order: "desc",
    overdue: false,
    page: 1,
    email: "",
  };
}

export function emailListUrl(filters: EmailFilters, updates: Partial<EmailFilters> = {}) {
  const values = { ...filters, ...updates };
  const params = new URLSearchParams();
  const defaults = defaultEmailFilters();
  for (const key of [
    "search",
    "source",
    "kind",
    "status",
    "environment",
    "dateField",
    "sort",
    "order",
    "tracking",
    "email",
  ] as const)
    if (values[key] && values[key] !== defaults[key]) params.set(key, values[key]);
  if (values.dateFrom) params.set("from", values.dateFrom);
  if (values.dateTo) params.set("to", values.dateTo);
  if (values.overdue) params.set("overdue", "1");
  if (values.page > 1) params.set("page", String(values.page));
  return params.size > 0 ? `/mails?${params}` : "/mails";
}
