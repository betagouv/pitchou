export type DownloadableFile = { url: string; name: string };

/** Browsers drop downloads fired in the same tick, so space the clicks out. */
const DELAY_BETWEEN_DOWNLOADS_MS = 300;

function triggerDownload({ url, name }: DownloadableFile) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}

/**
 * Download files one after another. The browser streams each one straight to disk, so large
 * pièces jointes never go through memory.
 */
export async function downloadUrls(files: DownloadableFile[]): Promise<void> {
  for (const [index, file] of files.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_DOWNLOADS_MS));
    }
    triggerDownload(file);
  }
}
