import { afterEach, beforeEach, expect, test, vi } from "vitest";
const { first, query } = vi.hoisted(() => ({ first: vi.fn(), query: vi.fn() }));
vi.mock("../database.ts", () => ({ directDatabaseConnection: query }));
vi.mock("./issues.ts", () => ({
  reportEmailIssue: vi.fn(),
  TECH_EMAIL: "tech@pitchou.beta.gouv.fr",
  ISSUE_NOTIFICATION_TAG: "pitchou-email-issue",
}));
import { reportEmailIssue } from "./issues.ts";
import { reportBrevoWebhookIssue } from "./webhookIssue.ts";
const event = {
  type: "blocked" as const,
  providerMessageId: "id",
  recipientEmail: "member@test.fr",
  occurredAt: new Date(),
  reason: "blocked recipient",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "");
  query.mockReturnValue({ where: () => ({ first }) });
  first.mockResolvedValue(undefined);
  vi.mocked(reportEmailIssue).mockResolvedValue("processed");
});
afterEach(() => vi.unstubAllEnvs());

test("reports delivery failures for notification and login emails, including copies", async () => {
  await reportBrevoWebhookIssue(
    event,
    ["pitchou-env-production", "dossier-assignment"],
    "Attribution dossier",
  );
  expect(reportEmailIssue).toHaveBeenCalledWith(
    expect.objectContaining({
      recipient: "member@test.fr",
      type: "blocked",
      subject: "Attribution dossier",
    }),
  );
  expect(query).not.toHaveBeenCalled();
});

test("ignores technical alert failures and successful delivery events", async () => {
  await reportBrevoWebhookIssue(event, ["pitchou-env-production", "pitchou-email-issue"], "Alert");
  await reportBrevoWebhookIssue(
    { ...event, recipientEmail: "tech@pitchou.beta.gouv.fr" },
    ["pitchou-env-production"],
    "Alert",
  );
  await reportBrevoWebhookIssue({ ...event, type: "delivered" }, [], "Delivery");
  expect(reportEmailIssue).not.toHaveBeenCalled();
});

test("untagged historical failures require a local provider ID match", async () => {
  await reportBrevoWebhookIssue(event, [], "Unknown");
  expect(reportEmailIssue).not.toHaveBeenCalled();
  first.mockResolvedValueOnce({ id: "known" });
  await reportBrevoWebhookIssue(event, [], "Known");
  expect(reportEmailIssue).toHaveBeenCalledOnce();
});

test("an untagged early failure matches by local request ID before its provider ID is saved", async () => {
  const where = vi.fn().mockReturnValue({ first });
  query.mockReturnValue({ where });
  first.mockResolvedValueOnce({ id: "local-request-id" });
  await reportBrevoWebhookIssue({ ...event, requestId: "local-request-id" }, [], "Early bounce");
  expect(where).toHaveBeenCalledWith({ id: "local-request-id" });
  expect(reportEmailIssue).toHaveBeenCalledWith(
    expect.objectContaining({ type: "blocked", key: "delivery:id:member@test.fr" }),
  );
});
