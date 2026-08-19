import sanitizeHtml from "sanitize-html";

// The allowlist mirrors the extensions enabled in the admin RichTextEditor
// (StarterKit with headings limited to h2/h3, plus links). Everything else —
// images, style/class attributes, iframes, scripts, event handlers — is
// stripped at write time so the public page can render `contenu` with {@html}.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h2",
    "h3",
    "strong",
    "em",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "a",
    "br",
    "hr",
  ],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  // Links always open in a new tab without exposing the opener.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
};

export function sanitizeChangelogContenu(contenu: string): string {
  return sanitizeHtml(contenu, SANITIZE_OPTIONS);
}
