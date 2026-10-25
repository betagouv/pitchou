import { error } from "@sveltejs/kit";

export async function readImportBody(request: Request) {
  if (Number(request.headers.get("content-length")) > 4096) error(413, "Requête trop volumineuse.");
  const reader = request.body?.getReader();
  let text = "";
  let size = 0;
  const decoder = new TextDecoder();
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          error(413, "Requête trop volumineuse.");
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    error(400, "Requête JSON invalide.");
  }
}
