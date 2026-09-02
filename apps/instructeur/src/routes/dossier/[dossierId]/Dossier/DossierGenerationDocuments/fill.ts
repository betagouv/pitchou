import { fillOdtTemplate } from "@odfjs/odfjs";

import type { BalisesGenerationDocument } from "@pitchou/types/balisesGenerationDocument.d.ts";

export type FilledDocument = {
  blob: Blob;
  name: string;
};

/**
 * The moment a document was generated, as stamped in its filename: the local
 * time of the instructeur's machine, in characters every filesystem accepts —
 * the ':' of an ISO time is forbidden in Windows filenames.
 */
export function generationTimestamp(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}-${pad(date.getHours())}h${pad(date.getMinutes())}`;
}

/**
 * Fills every template with the dossier's tags. Each document keeps its
 * template's name, stamped with the moment it was generated so successive
 * generations do not collide in the download folder.
 */
export function fillTemplates(
  templates: File[],
  tags: BalisesGenerationDocument,
  datetime: string,
): Promise<FilledDocument[]> {
  return Promise.all(
    templates.map(async (template) => {
      const templateArrayBuffer = await template.arrayBuffer();
      const documentArrayBuffer = await fillOdtTemplate(templateArrayBuffer, tags);
      const extensionStart = template.name.lastIndexOf(".");
      const basename =
        extensionStart === -1 ? template.name : template.name.slice(0, extensionStart);
      const extension = extensionStart === -1 ? "" : template.name.slice(extensionStart);

      return {
        blob: new Blob([documentArrayBuffer], { type: template.type }),
        name: `${basename}-${datetime}${extension}`,
      };
    }),
  );
}
