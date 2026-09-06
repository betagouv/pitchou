import { afterEach, expect, test, vi } from "vitest";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("ky", () => ({ default: { post } }));

import {
  getEmailEnvironmentTag,
  sendEmail,
  sendLoginEmail,
  sendCnpnEmailReadReceipt,
} from "./emails.ts";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

test.each([
  ["staging", "production", "pitchou-env-staging"],
  ["staging", "development", "pitchou-env-staging"],
  ["", "production", "pitchou-env-production"],
  [undefined, "production", "pitchou-env-production"],
  ["", "development", "pitchou-env-development"],
  [undefined, "test", "pitchou-env-development"],
])("tags every email from %s / %s as %s", async (pitchouEnv, nodeEnv, tag) => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", pitchouEnv);
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("BREVO_API_KEY", "test-key");
  post.mockReturnValue({ json: vi.fn().mockResolvedValue({ messageId: "test-message" }) });

  expect(getEmailEnvironmentTag()).toBe(tag);
  await sendEmail({
    to: ["test@example.com"],
    subject: "Saisine",
    htmlContent: "<p>Test</p>",
    tags: ["cnpn-saisine", "pitchou-env-staging", "pitchou-env-production", "pitchou-env-other"],
  });
  await sendLoginEmail("test@example.com", "https://pitchou.test/?secret=test");
  await sendCnpnEmailReadReceipt("test@example.com", {
    eventId: "11111111-1111-4111-8111-111111111111",
    dossierId: 42,
    originalSubject: "Saisine",
  });

  expect(post.mock.calls.map(([, options]) => options.json.tags)).toEqual([
    ["cnpn-saisine", tag],
    [tag],
    ["cnpn-read-receipt", tag],
  ]);
});
