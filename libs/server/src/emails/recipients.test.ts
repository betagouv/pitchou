import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { sendEmail, sendLoginEmail, sendCnpnEmailReadReceipt } from "../emails.ts";
import { sendBrevoEmail } from "./delivery.ts";
import { StagingEmailSuppressedError } from "./recipients.ts";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("ky", () => ({ default: { post } }));
const message = { to: ["tester@example.com"], subject: "Test", htmlContent: "Test" };

beforeEach(() => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  vi.stubEnv("STAGING_EMAIL_ALLOWLIST", "");
  vi.stubEnv("MAILPIT_URL", "");
  vi.stubEnv("BREVO_API_KEY", "test-key");
  post.mockReturnValue({ json: vi.fn().mockResolvedValue({ messageId: "simulated" }) });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

test.each([
  "",
  undefined,
  "someone-else@example.com",
  "*@example.com",
  "tester@example.com,invalid",
])(
  "blocks default, unlisted and malformed recipient configurations %s without contacting Brevo",
  (value) => {
    vi.stubEnv("STAGING_EMAIL_ALLOWLIST", value);
    expect(() => sendEmail(message)).toThrow(StagingEmailSuppressedError);
    expect(post).not.toHaveBeenCalled();
  },
);

test("allows only exact addresses, normalizing list case and whitespace", async () => {
  vi.stubEnv("STAGING_EMAIL_ALLOWLIST", " TESTER@example.com , copy@example.com ");
  await sendEmail({ ...message, cc: ["copy@example.com"], bcc: ["tester@example.com"] });
  expect(post).toHaveBeenCalledOnce();
  expect(post.mock.calls[0][1].json.bcc).toEqual([{ email: "tester@example.com" }]);
});

test.each(["to", "cc", "bcc"])(
  "rejects the whole message if %s includes a non-allowed address",
  (field) => {
    vi.stubEnv("STAGING_EMAIL_ALLOWLIST", "tester@example.com");
    expect(() =>
      sendEmail({ ...message, [field]: ["tester@example.com", "team@example.com"] }),
    ).toThrow(StagingEmailSuppressedError);
    expect(post).not.toHaveBeenCalled();
  },
);

test.each([
  {
    to: [{ email: "tester@example.com" }],
    messageVersions: [{ to: [{ email: "team@example.com" }] }],
  },
  { to: [{ email: "tester@example.com" }], cc: "team@example.com" },
  { to: [{ name: "tester@example.com" }] },
  { to: [] },
  { to: [{ email: "tester@example.com" }, { email: "Tester <tester@example.com>" }] },
])("rejects malformed and batch recipient overrides", (payload) => {
  vi.stubEnv("STAGING_EMAIL_ALLOWLIST", "tester@example.com");
  expect(() => sendBrevoEmail(payload)).toThrow(StagingEmailSuppressedError);
  expect(post).not.toHaveBeenCalled();
});

test("the same restriction covers login templates and read receipts", async () => {
  await expect(sendLoginEmail("team@example.com", "https://pitchou.test")).rejects.toThrow(
    StagingEmailSuppressedError,
  );
  await expect(
    sendCnpnEmailReadReceipt("team@example.com", {
      eventId: "test",
      dossierId: 1,
      originalSubject: "Test",
    }),
  ).rejects.toThrow(StagingEmailSuppressedError);
  expect(post).not.toHaveBeenCalled();
});

test("admin membership and reply-to do not authorize recipients", () => {
  vi.stubEnv("PITCHOU_ADMIN_EMAILS", "tester@example.com");
  expect(() => sendEmail({ ...message, replyTo: "tester@example.com" })).toThrow(
    StagingEmailSuppressedError,
  );
  expect(post).not.toHaveBeenCalled();
});

test("production delivery is unaffected by the staging list", async () => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "");
  vi.stubEnv("NODE_ENV", "production");
  await sendEmail({ ...message, cc: ["team@example.com"] });
  expect(post).toHaveBeenCalledOnce();
});
