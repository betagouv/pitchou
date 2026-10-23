const EMAIL_ADDRESS = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/u;

export class StagingEmailSuppressedError extends Error {
  constructor() {
    super(
      "Envoi bloqué en préproduction. Tous les destinataires et les copies doivent être autorisés.",
    );
    this.name = "StagingEmailSuppressedError";
  }
}

export function assertStagingRecipients(recipients: unknown[]): void {
  if (process.env.PUBLIC_PITCHOU_ENV !== "staging") return;
  const configured = (process.env.STAGING_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (configured.some((address) => !EMAIL_ADDRESS.test(address) || address.includes("*")))
    throw new StagingEmailSuppressedError();
  const allowed = new Set(configured);
  if (
    recipients.length === 0 ||
    recipients.some(
      (address) =>
        typeof address !== "string" ||
        !EMAIL_ADDRESS.test(address.trim()) ||
        !allowed.has(address.trim().toLowerCase()),
    )
  )
    throw new StagingEmailSuppressedError();
}

export function assertStagingEmailPayload(payload: Record<string, unknown>): void {
  if (process.env.PUBLIC_PITCHOU_ENV !== "staging") return;
  // Reject batch overrides rather than let them bypass the checked envelope.
  if (
    payload.messageVersions !== undefined ||
    !Array.isArray(payload.to) ||
    payload.to.length === 0
  )
    throw new StagingEmailSuppressedError();
  const recipients: unknown[] = [];
  for (const key of ["to", "cc", "bcc"]) {
    const addresses = payload[key];
    if (addresses === undefined) continue;
    if (!Array.isArray(addresses)) throw new StagingEmailSuppressedError();
    for (const address of addresses)
      recipients.push(address && typeof address === "object" ? address.email : undefined);
  }
  assertStagingRecipients(recipients);
}
