import type { BrevoSendResponse } from "../emails.ts";

type Address = { email: string; name?: string };
type Attachment = { name: string; content: string };

/** Opt-in development capture. A broken inbox must never fall back to real delivery. */
export function captureEmail(
  payload: Record<string, unknown>,
  tags: string[],
): Promise<BrevoSendResponse> | null {
  const configured = process.env.MAILPIT_URL;
  if (!configured) return null;
  if (!["development", "test"].includes(process.env.NODE_ENV ?? "")) {
    throw new Error("MAILPIT_URL is only allowed in development or tests");
  }
  const url = new URL(configured);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("MAILPIT_URL must point to the local test inbox");
  }
  if (payload.templateId !== undefined) {
    throw new Error(
      "Hosted Brevo templates are unavailable in the test inbox. Use a seeded test account.",
    );
  }
  const address = ({ email, name }: Address) => ({ Email: email, Name: name ?? "" });
  const sender = payload.sender as Address;
  const message = {
    From: address(sender),
    To: (payload.to as Address[]).map(address),
    Bcc: ((payload.bcc ?? []) as Address[]).map(address),
    Cc: ((payload.cc ?? []) as Address[]).map(address),
    ...(payload.replyTo ? { ReplyTo: [address(payload.replyTo as Address)] } : {}),
    Subject: payload.subject,
    HTML: payload.htmlContent,
    Tags: tags,
    Headers: payload.headers,
    Attachments: ((payload.attachment ?? []) as Attachment[]).map(({ name, content }) => ({
      Filename: name,
      Content: content,
      ContentType: "application/octet-stream",
    })),
  };
  return send(new URL("api/v1/send", url.href.endsWith("/") ? url : `${url}/`), message);
}

async function send(url: URL, message: unknown): Promise<BrevoSendResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10_000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Test inbox rejected the email (${response.status})`);
  const result = (await response.json()) as { ID?: unknown };
  if (typeof result.ID !== "string" || !result.ID) throw new Error("Invalid test inbox response");
  return { messageId: result.ID };
}
