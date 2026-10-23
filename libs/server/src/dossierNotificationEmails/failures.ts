export function notificationErrorCategory(error: unknown): string {
  if (error instanceof Error && error.message === "Missing BREVO_API_KEY environment variable")
    return "configuration";
  const response =
    error && typeof error === "object" && "response" in error ? error.response : null;
  if (response instanceof Response) {
    if (response.status === 429) return "rate_limited";
    if ([401, 403].includes(response.status)) return "authentication";
    if (response.status === 408) return "timeout";
    if (response.status >= 500) return "provider_unavailable";
    if (response.status >= 400) return "provider_rejected";
  }
  if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name))
    return "timeout";
  if (error instanceof TypeError) return "network";
  return "unknown";
}

export function providerMessageId(result: unknown): string | null {
  if (!result || typeof result !== "object" || !("messageId" in result)) return null;
  return typeof result.messageId === "string" ? result.messageId.slice(0, 512) : null;
}
