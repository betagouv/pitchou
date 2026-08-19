import sanitizeHtml from "sanitize-html";

import { isOwnMediaUrl } from "../../changelogMedia.ts";

// The allowlist mirrors the extensions enabled in the admin RichTextEditor
// (StarterKit with headings limited to h2/h3, links, and uploaded media).
// Everything else — style/class attributes, iframes, scripts, event handlers —
// is stripped at write time so the public page can render `contenu` with {@html}.
const ALLOWED_TAGS = [
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
  "img",
  "video",
];

function optionsFor(entryId: number | null): sanitizeHtml.IOptions {
  return {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      // `width` (resize by drag) and `data-align` come from the editor's media nodes.
      img: ["src", "alt", "width", "data-align"],
      video: ["src", "controls", "preload", "width", "data-align"],
      // Text alignment; allowedStyles below restricts it to text-align only.
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
    },
    allowedStyles: { "*": { "text-align": [/^(left|center|right)$/] } },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    // Links always open in a new tab without exposing the opener.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
    // Media may only point at this very entry's uploads (`/changelog-media/<entryId>/…`):
    // no hotlinking, no tracking pixels, and the orphan cleanup — which only ever
    // considers the entry's own contenu — can never break another entry.
    exclusiveFilter: (frame) =>
      (frame.tag === "img" || frame.tag === "video") &&
      (entryId === null || !isOwnMediaUrl(frame.attribs.src ?? "", entryId)),
  };
}

/**
 * `entryId` scopes the media allowed in `contenu`; pass `null` when the entry
 * does not exist yet (a fresh draft cannot have uploads, so no media survives).
 */
export function sanitizeChangelogContenu(contenu: string, entryId: number | null): string {
  return sanitizeHtml(contenu, optionsFor(entryId));
}
