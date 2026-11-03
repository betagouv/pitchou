import { afterEach, expect, test, vi } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import {
  reportEmailIssue,
  retryEmailIssues,
  TECH_EMAIL,
  type EmailIssue,
} from "@pitchou/server/emails/issues.ts";
import { getEmailEnvironmentTag } from "@pitchou/server/emails.ts";

afterEach(() => vi.unstubAllEnvs());
function issue(key = "provider-id:recipient@test.fr"): EmailIssue {
  return {
    key,
    environment: getEmailEnvironmentTag(),
    type: "soft_bounce",
    recipient: "recipient@test.fr",
    subject: "Projet <CNPN>",
    reason: "552 too big <script>bad()</script>",
    occurredAt: new Date(),
    providerMessageId: "provider-id",
  };
}

test("deduplicates concurrent technical alerts and escapes the provider's reason", async () => {
  const send = vi.fn().mockResolvedValue({ messageId: "alert" });
  const event = issue();
  await Promise.all([reportEmailIssue(event, { db, send }), reportEmailIssue(event, { db, send })]);
  await reportEmailIssue(event, { db, send });
  expect(send).toHaveBeenCalledOnce();
  expect(send.mock.calls[0][0]).toMatchObject({ to: [TECH_EMAIL], tags: ["pitchou-email-issue"] });
  expect(send.mock.calls[0][0].htmlContent).toContain("&lt;script&gt;");
  expect(await db("email_issue_notification").whereNotNull("sent_at")).toHaveLength(1);
});

test("retries unsent alerts in the worker and keeps their idempotency key", async () => {
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error("provider down"))
    .mockResolvedValue({ messageId: "alert" });
  await expect(reportEmailIssue(issue(), { db, send })).rejects.toThrow("provider down");
  expect(await db("email_issue_notification").first()).toMatchObject({
    claimed_at: null,
    sent_at: null,
  });
  expect(await retryEmailIssues({ db, send, dryRun: true })).toEqual({ candidates: 1 });
  expect(send).toHaveBeenCalledTimes(1);
  expect(await retryEmailIssues({ db, send })).toEqual({ candidates: 1, failed: 0 });
  expect(send.mock.calls[1][0].headers).toEqual(send.mock.calls[0][0].headers);
  expect(await retryEmailIssues({ db, send })).toEqual({ candidates: 0, failed: 0 });
});

test("reclaims crashed alert sends after five minutes and separates recipients", async () => {
  const send = vi.fn().mockRejectedValue(new Error("provider down"));
  const event = issue();
  await expect(reportEmailIssue(event, { db, send })).rejects.toThrow();
  await db("email_issue_notification").update({ claimed_at: new Date() });
  expect(await reportEmailIssue(event, { db, send })).toBe("retry");
  await db("email_issue_notification").update({ claimed_at: new Date(Date.now() - 6 * 60_000) });
  send.mockResolvedValue({ messageId: "alert" });
  await reportEmailIssue(event, { db, send });
  await reportEmailIssue(issue("provider-id:copy@test.fr"), { db, send });
  expect(await db("email_issue_notification").whereNotNull("sent_at")).toHaveLength(2);
});

test("staging and automated test restrictions also cover technical alerts", async () => {
  const send = vi.fn();
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  vi.stubEnv("STAGING_EMAIL_ALLOWLIST", "");
  await reportEmailIssue(issue(), { db, send });
  expect(send).not.toHaveBeenCalled();
  vi.stubEnv("STAGING_EMAIL_ALLOWLIST", TECH_EMAIL);
  await reportEmailIssue(issue(), { db, send });
  expect(send).toHaveBeenCalledOnce();
  vi.stubEnv("PITCHOU_EMAIL_DELIVERY_DISABLED", "true");
  await reportEmailIssue(issue("another"), { db, send });
  expect(send).toHaveBeenCalledOnce();
});

test("stops ambiguous alert retries after the provider's deduplication window", async () => {
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error("lost response"))
    .mockResolvedValue({ messageId: "alert" });
  const event = issue();
  await expect(reportEmailIssue(event, { db, send })).rejects.toThrow("lost response");
  const firstAttemptAt = new Date(Date.now() - 26 * 60_000);
  await db("email_issue_notification").update({ first_attempt_at: firstAttemptAt });
  expect(await reportEmailIssue(event, { db, send })).toBe("processed");
  expect(send).toHaveBeenCalledTimes(1);
  expect(await db("email_issue_notification").whereNotNull("uncertain_at")).toHaveLength(1);
  expect(await retryEmailIssues({ db, send })).toEqual({ candidates: 0, failed: 0 });
});

test("explicit provider rejections can retry later without hiding an earlier ambiguous attempt", async () => {
  const rejected = Object.assign(new Error("rejected"), {
    response: new Response(null, { status: 400 }),
  });
  const send = vi.fn().mockRejectedValueOnce(rejected).mockResolvedValue({ messageId: "alert" });
  const event = issue();
  await expect(reportEmailIssue(event, { db, send })).rejects.toThrow("rejected");
  expect(await db("email_issue_notification").first()).toMatchObject({ first_attempt_at: null });
  await db("email_issue_notification").update({ created_at: new Date(Date.now() - 60 * 60_000) });
  await reportEmailIssue(event, { db, send });
  expect(send).toHaveBeenCalledTimes(2);

  const ambiguous = issue("another");
  send.mockRejectedValueOnce(new Error("lost response"));
  await expect(reportEmailIssue(ambiguous, { db, send })).rejects.toThrow();
  const first = await db("email_issue_notification").whereNull("sent_at").first();
  send.mockRejectedValueOnce(rejected);
  await expect(reportEmailIssue(ambiguous, { db, send })).rejects.toThrow();
  expect(await db("email_issue_notification").where({ id: first.id }).first()).toMatchObject({
    first_attempt_at: first.first_attempt_at,
  });
});

test("a retry crossing the ambiguity cutoff cannot revoke an active alert send", async () => {
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const completed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const send = vi.fn(async () => {
    started();
    await completed;
  });
  const event = issue();
  const sending = reportEmailIssue(event, { db, send });
  await ready;
  try {
    await db("email_issue_notification").update({
      first_attempt_at: new Date(Date.now() - 26 * 60_000),
    });
    expect(await reportEmailIssue(event, { db, send })).toBe("retry");
    expect(await db("email_issue_notification").first()).toMatchObject({ uncertain_at: null });
  } finally {
    release();
    await sending;
  }
  expect(await db("email_issue_notification").whereNotNull("sent_at")).toHaveLength(1);
  expect(send).toHaveBeenCalledOnce();
});
