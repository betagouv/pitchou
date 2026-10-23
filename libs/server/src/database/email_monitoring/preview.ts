import sanitizeHtml from "sanitize-html";

const color = /^(?:#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|[a-z]+)$/iu;
const lengths = /^(?:(?:\d+(?:\.\d+)?(?:px|pt|em|rem|%)?|auto)(?:\s+|$)){1,4}$/u;
const border =
  /^(?:0|\d+(?:\.\d+)?(?:px|pt)\s+(?:solid|dashed|dotted)\s+(?:#[\da-f]{3,8}|[a-z]+))$/iu;
const styles = {
  color: [color],
  "background-color": [color],
  "font-family": [/^[a-z\s,\-'"]+$/iu],
  "font-size": [lengths],
  "font-weight": [/^(?:normal|bold|[1-9]00)$/u],
  "font-style": [/^(?:normal|italic)$/u],
  "line-height": [lengths],
  "text-align": [/^(?:left|center|right|justify)$/u],
  "text-decoration": [/^(?:none|underline|line-through)$/u],
  "overflow-wrap": [/^(?:normal|anywhere|break-word)$/u],
  "word-break": [/^(?:normal|break-word|break-all)$/u],
  "white-space": [/^(?:normal|pre|pre-wrap)$/u],
  display: [/^(?:block|inline|inline-block|table|table-row|table-cell)$/u],
  "vertical-align": [/^(?:top|middle|bottom|baseline)$/u],
  "border-collapse": [/^(?:collapse|separate)$/u],
  "border-spacing": [lengths],
  ...Object.fromEntries(
    [
      "width",
      "height",
      "max-width",
      "min-width",
      "max-height",
      "min-height",
      "margin",
      "padding",
      ...["top", "right", "bottom", "left"].flatMap((side) => [
        `margin-${side}`,
        `padding-${side}`,
      ]),
    ].map((key) => [key, [lengths]]),
  ),
  ...Object.fromEntries(
    ["border", "border-top", "border-right", "border-bottom", "border-left"].map((key) => [
      key,
      [border],
    ]),
  ),
  "border-radius": [lengths],
};

function trustedLogo(siteUrl?: string) {
  if (!siteUrl) return null;
  try {
    const site = new URL(siteUrl);
    if (!["http:", "https:"].includes(site.protocol) || site.username || site.password) return null;
    return new URL("/images/pitchou-logo-email.png", site).href;
  } catch {
    return null;
  }
}

const previewOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "body",
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "div",
    "span",
    "strong",
    "b",
    "em",
    "i",
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
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "img",
  ],
  nonTextTags: [
    "head",
    "title",
    "script",
    "style",
    "textarea",
    "option",
    "noscript",
    "iframe",
    "object",
  ],
  allowedAttributes: {
    "*": ["style"],
    body: ["bgcolor"],
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    table: ["role", "width", "height", "border", "cellpadding", "cellspacing", "bgcolor", "align"],
    tr: ["bgcolor", "align", "valign"],
    td: ["colspan", "rowspan", "width", "height", "bgcolor", "align", "valign"],
    th: ["colspan", "rowspan", "width", "height", "bgcolor", "align", "valign"],
  },
  allowedStyles: { "*": styles },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
  },
};

/** Read-only rendering of recorded HTML. Never fetch remote content or regenerate a message. */
export function emailPreviewHtml(
  html: string,
  siteUrl = process.env.PUBLIC_SITE_URL_PITCHOU,
): string {
  const logo = trustedLogo(siteUrl);
  const clean = sanitizeHtml(html, {
    ...previewOptions,
    exclusiveFilter: (frame) => frame.tag === "img" && (!logo || frame.attribs.src !== logo),
  });
  const policy = `default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src ${logo ?? "'none'"}; base-uri 'none'; form-action 'none'`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta http-equiv="Content-Security-Policy" content="${policy}"></head>${clean.includes("<body") ? clean : `<body>${clean}</body>`}</html>`;
}
