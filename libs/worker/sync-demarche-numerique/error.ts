/** Keep the database cause without retaining Knex's potentially enormous SQL prefix. */
export function synchronizationErrorMessage(error: unknown): string {
  let message = error instanceof Error ? error.message : String(error);
  const separator = message.lastIndexOf(" - ");
  if (/^(insert|update|delete|select|with)\b/iu.test(message) && separator >= 0)
    message = message.slice(separator + 3);
  if (message.length > 2_000) message = `…${message.slice(-2_000)}`;
  return message;
}
