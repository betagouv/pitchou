/**
 * Progress of the browser-to-storage upload in flight, shared by every form
 * that sends files so each can show it in its submit button.
 */
export const uploadProgress = $state<{ fraction: number | null }>({ fraction: null });

/** The submit button label: the upload percentage while sending, `fallback` otherwise. */
export function uploadProgressLabel(fallback: string): string {
  const { fraction } = uploadProgress;
  if (fraction === null) return fallback;
  return `Envoi des fichiers… ${Math.round(fraction * 100)} %`;
}
