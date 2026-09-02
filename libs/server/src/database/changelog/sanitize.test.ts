import { expect, test } from "vitest";

import { sanitizeChangelogContenu } from "./sanitize.ts";

const MEDIA_URL = "/changelog-media/7/6f9619ff-8b86-4d01-b42d-00cf4fc964ff.png";
const VIDEO_URL = "/changelog-media/7/6f9619ff-8b86-4d01-b42d-00cf4fc964ff.mp4";

test("keeps the markup produced by the editor", () => {
  const html =
    "<h2>Titre</h2><p><strong>gras</strong> <em>italique</em> <u>souligné</u> <s>barré</s></p>" +
    "<ul><li>a</li></ul><ol><li>b</li></ol><blockquote><p>citation</p></blockquote>" +
    "<pre><code>code</code></pre><hr /><p>fin<br />ligne</p>";
  expect(sanitizeChangelogContenu(html, 7)).toBe(html);
});

test("strips scripts entirely", () => {
  expect(sanitizeChangelogContenu("<p>ok</p><script>alert(1)</script>", 7)).toBe("<p>ok</p>");
});

test("strips event handlers and style/class attributes", () => {
  expect(
    sanitizeChangelogContenu('<p onclick="alert(1)" style="color:red" class="x">ok</p>', 7),
  ).toBe("<p>ok</p>");
});

test("strips disallowed tags (iframe, h1) but keeps their text content", () => {
  expect(sanitizeChangelogContenu('<iframe src="https://example.org"></iframe>', 7)).toBe("");
  expect(sanitizeChangelogContenu("<h1>titre</h1>", 7)).toBe("titre");
});

test("links keep http/https/mailto hrefs and get rel/target enforced", () => {
  expect(sanitizeChangelogContenu('<a href="https://example.org">lien</a>', 7)).toBe(
    '<a href="https://example.org" rel="noopener noreferrer" target="_blank">lien</a>',
  );
  expect(sanitizeChangelogContenu('<a href="mailto:a@b.fr">écrire</a>', 7)).toBe(
    '<a href="mailto:a@b.fr" rel="noopener noreferrer" target="_blank">écrire</a>',
  );
});

test("drops javascript: hrefs", () => {
  expect(sanitizeChangelogContenu('<a href="javascript:alert(1)">lien</a>', 7)).toBe(
    '<a rel="noopener noreferrer" target="_blank">lien</a>',
  );
});

test("keeps media pointing at the entry's own uploads, without extra attributes", () => {
  expect(sanitizeChangelogContenu(`<img src="${MEDIA_URL}" alt="capture" class="x" />`, 7)).toBe(
    `<img src="${MEDIA_URL}" alt="capture" />`,
  );
  expect(
    sanitizeChangelogContenu(`<video src="${VIDEO_URL}" controls preload="metadata"></video>`, 7),
  ).toBe(`<video src="${VIDEO_URL}" controls preload="metadata"></video>`);
});

test("keeps media width and alignment set in the editor", () => {
  expect(
    sanitizeChangelogContenu(`<img src="${MEDIA_URL}" width="320" data-align="center" />`, 7),
  ).toBe(`<img src="${MEDIA_URL}" width="320" data-align="center" />`);
});

test("keeps text alignment but no other inline style", () => {
  expect(sanitizeChangelogContenu('<p style="text-align: center">ok</p>', 7)).toBe(
    '<p style="text-align:center">ok</p>',
  );
  expect(sanitizeChangelogContenu('<h2 style="text-align: right; color: red">t</h2>', 7)).toBe(
    '<h2 style="text-align:right">t</h2>',
  );
  expect(sanitizeChangelogContenu('<p style="position: fixed">x</p>', 7)).toBe("<p>x</p>");
  expect(sanitizeChangelogContenu('<li style="text-align: center">x</li>', 7)).toBe("<li>x</li>");
});

test("drops media pointing anywhere else", () => {
  // External URL (hotlinking / tracking pixel).
  expect(sanitizeChangelogContenu('<img src="https://evil.example/pixel.png" />', 7)).toBe("");
  // Another entry's media: the orphan cleanup of that entry could delete it.
  expect(sanitizeChangelogContenu(`<img src="${MEDIA_URL}" />`, 8)).toBe("");
  // Non-uuid file name.
  expect(sanitizeChangelogContenu('<img src="/changelog-media/7/../../files/x.png" />', 7)).toBe(
    "",
  );
  // Missing src, data: URL.
  expect(sanitizeChangelogContenu("<img />", 7)).toBe("");
  expect(sanitizeChangelogContenu('<img src="data:image/png;base64,AAAA" />', 7)).toBe("");
});

test("a fresh draft (no id yet) cannot embed any media", () => {
  expect(sanitizeChangelogContenu(`<p>ok</p><img src="${MEDIA_URL}" />`, null)).toBe("<p>ok</p>");
});
