import { afterEach, expect, test, vi } from "vitest";
import { sendEmail, sendLoginEmail } from "../emails.ts";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function inbox() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("MAILPIT_URL", "http://127.0.0.1:8025/test-inbox/");
  vi.stubEnv("BREVO_API_KEY", "");
  const request = vi.fn().mockResolvedValue(Response.json({ ID: "captured" }));
  vi.stubGlobal("fetch", request);
  return request;
}

test("captures recipients, HTML, headers and attachments without a Brevo key", async () => {
  const request = inbox();
  expect(
    await sendEmail({
      to: ["b@example.test"],
      cc: ["c@example.test"],
      replyTo: "a@example.test",
      subject: "Attribution",
      htmlContent: "<p>Dossier</p>",
      tags: ["assignment"],
      headers: { idempotencyKey: "event-1" },
      attachments: [{ name: "a.txt", content: Buffer.from("hello") }],
    }),
  ).toEqual({ messageId: "captured" });
  expect(request).toHaveBeenCalledOnce();
  expect(String(request.mock.calls[0][0])).toBe("http://127.0.0.1:8025/test-inbox/api/v1/send");
  expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({
    To: [{ Email: "b@example.test" }],
    Cc: [{ Email: "c@example.test" }],
    ReplyTo: [{ Email: "a@example.test" }],
    HTML: "<p>Dossier</p>",
    Headers: { idempotencyKey: "event-1" },
    Tags: ["assignment"],
    Attachments: [{ Filename: "a.txt", Content: "aGVsbG8=" }],
  });
});

test.each(["production", ""])("refuses capture outside development: %s", (environment) => {
  const request = inbox();
  vi.stubEnv("NODE_ENV", environment);
  expect(() => sendEmail({ to: [], subject: "Test", htmlContent: "" })).toThrow("only allowed");
  expect(request).not.toHaveBeenCalled();
});

test.each([
  "https://example.com",
  "http://localhost:8025",
  "http://user:pass@127.0.0.1",
  "http://127.0.0.1/?x=1",
])("refuses an unsafe inbox address: %s", (url) => {
  inbox();
  vi.stubEnv("MAILPIT_URL", url);
  expect(() => sendEmail({ to: [], subject: "Test", htmlContent: "" })).toThrow();
});

test("never falls back to Brevo when capture fails", async () => {
  const request = inbox();
  vi.stubEnv("BREVO_API_KEY", "must-not-be-used");
  request.mockResolvedValue(new Response("unavailable", { status: 503 }));
  await expect(sendEmail({ to: [], subject: "Test", htmlContent: "" })).rejects.toThrow("503");
  expect(request).toHaveBeenCalledOnce();
});

test("does not recreate hosted login templates", async () => {
  const request = inbox();
  await expect(sendLoginEmail("a@example.test", "https://pitchou.test")).rejects.toThrow(
    "seeded test account",
  );
  expect(request).not.toHaveBeenCalled();
});
