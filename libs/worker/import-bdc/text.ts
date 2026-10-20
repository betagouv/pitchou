/** Converts the HTML fragments in BDC citations to plain text. */
export function cleanHtmlText(value: string): string {
  return value
    .replaceAll(/<[^>]*>/gu, "")
    .replaceAll(/&#(\d+);/gu, (entity, code: string) => decodeCodePoint(entity, Number(code)))
    .replaceAll(/&#x([\da-f]+);/giu, (entity, code: string) =>
      decodeCodePoint(entity, parseInt(code, 16)),
    )
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function decodeCodePoint(entity: string, code: number): string {
  // Keep malformed entities visible instead of throwing or producing lone surrogates.
  if (
    !Number.isInteger(code) ||
    code < 0 ||
    code > 0x10ffff ||
    (code >= 0xd800 && code <= 0xdfff)
  ) {
    return entity;
  }
  return String.fromCodePoint(code);
}
