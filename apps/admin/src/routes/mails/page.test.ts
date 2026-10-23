import { beforeEach, expect, test, vi } from "vitest";
import { render } from "svelte/server";
import { isAdminEmail } from "@pitchou/server/admin.ts";
import { emailFilters, emailOverview } from "@pitchou/server/database/email_monitoring.ts";
import { load } from "./+page.server.ts";
import { emailListUrl, defaultEmailFilters } from "./query.ts";
import MailTable from "./MailTable.svelte";
import type { EmailRow } from "@pitchou/types/adminEmails.ts";
vi.mock("@pitchou/server/admin.ts", () => ({ isAdminEmail: vi.fn() }));
vi.mock("@pitchou/server/database/email_monitoring.ts", async (original) => ({
  ...(await original<typeof import("@pitchou/server/database/email_monitoring.ts")>()),
  emailOverview: vi.fn(),
}));
function event(user: { email: string } | null, search = "") {
  return { locals: { user }, url: new URL(`https://admin.test/mails${search}`) } as never;
}
beforeEach(() => vi.clearAllMocks());
test("requires an authenticated admin before querying either source or details", async () => {
  await expect(load(event(null))).rejects.toMatchObject({ status: 401 });
  vi.mocked(isAdminEmail).mockReturnValue(false);
  await expect(load(event({ email: "user@test.fr" }))).rejects.toMatchObject({ status: 403 });
  expect(emailOverview).not.toHaveBeenCalled();
});
test("validates filters before querying, and returns unified read-only results", async () => {
  vi.mocked(isAdminEmail).mockReturnValue(true);
  vi.mocked(emailOverview).mockResolvedValue({
    rows: [],
    counts: [],
    total: 0,
    page: 1,
    cnpn: { received: 0, opened: 0 },
    detail: null,
  });
  await expect(load(event({ email: "admin@test.fr" }, "?sort=message"))).rejects.toMatchObject({
    status: 400,
  });
  expect(emailOverview).not.toHaveBeenCalled();
  expect(
    await load(event({ email: "admin@test.fr" }, "?source=cnpn&tracking=opened")),
  ).toMatchObject({ filters: { source: "cnpn", tracking: "opened" }, overview: { total: 0 } });
});
test("preserves typed detail IDs, filters and pagination in shareable URLs", () => {
  const filters = emailFilters(
    new URLSearchParams(
      "search=Projet+%26+test&kind=cnpn&sort=dossier&order=asc&page=2&from=2026-10-23",
    ),
  );
  const id = "notification:00000000-0000-0000-0000-000000000001";
  const url = new URL(emailListUrl(filters, { email: id }), "https://admin.test");
  expect(url.pathname).toBe("/mails");
  expect(emailFilters(url.searchParams)).toEqual({ ...filters, email: id });
  expect(emailFilters(new URL(emailListUrl(filters, { email: "" }), url).searchParams).page).toBe(
    2,
  );
});
test.each([
  "sort=html",
  "order=sideways",
  "source=other",
  "tracking=click",
  "email=00000000-0000-0000-0000-000000000001",
  "email=cnpn:invalid",
  "from=2026-02-31",
  "environment=unknown",
  "status=delivered",
  "kind=other",
  "from=2026-10-24&to=2026-10-23",
])("rejects invalid unified query %s", (query) => {
  expect(() => emailFilters(new URLSearchParams(query))).toThrow(RangeError);
});
test("renders both sources with a native keyboard details button, source-specific tracking and no bottom history", () => {
  const common = {
    id: "same-id",
    status: "sent",
    dossier: 12,
    dossier_name: "Projet <test>",
    email: "recipient@test.fr",
    due_at: new Date(),
    sent_at: new Date(),
    created_at: new Date(),
    retry_at: null,
    first_names: null,
    last_name: null,
    personne: null,
    last_error: null,
    cancellation_reason: null,
    provider_message_id: null,
    subject: null,
  };
  const rows: EmailRow[] = [
    {
      ...common,
      source: "cnpn",
      kind: "cnpn",
      environment: "unrecorded",
      attempt_count: null,
      delivered_at: new Date(),
      opened_at: new Date(),
    },
    {
      ...common,
      source: "notification",
      kind: "arrival",
      environment: "preview",
      attempt_count: 1,
      delivered_at: null,
      opened_at: null,
    },
  ];
  const { body } = render(MailTable, { props: { rows, onOpen: vi.fn() } });
  expect(body).toContain("Saisine CNPN");
  expect(body).toContain("Arrivée");
  expect(body).toContain("Réception confirmée");
  expect(body).toContain("Ouverture détectée");
  expect(body).toContain("Non enregistré");
  expect(body).toContain("Détails du mail");
  expect(body).toContain("Projet &lt;test>");
  expect(body).not.toContain("notification-history-title");
});

test("reset matches server defaults and removes all query criteria", () => {
  expect(defaultEmailFilters()).toEqual(emailFilters(new URLSearchParams()));
  expect(emailListUrl(defaultEmailFilters())).toBe("/mails");
});
