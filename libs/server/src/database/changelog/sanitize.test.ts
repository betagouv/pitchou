import { expect, test } from "vitest";

import { sanitizeChangelogContenu } from "./sanitize.ts";

test("keeps the markup produced by the editor", () => {
  const html =
    "<h2>Titre</h2><p><strong>gras</strong> <em>italique</em> <u>souligné</u> <s>barré</s></p>" +
    "<ul><li>a</li></ul><ol><li>b</li></ol><blockquote><p>citation</p></blockquote>" +
    "<pre><code>code</code></pre><hr /><p>fin<br />ligne</p>";
  expect(sanitizeChangelogContenu(html)).toBe(html);
});

test("strips scripts entirely", () => {
  expect(sanitizeChangelogContenu("<p>ok</p><script>alert(1)</script>")).toBe("<p>ok</p>");
});

test("strips event handlers and style/class attributes", () => {
  expect(sanitizeChangelogContenu('<p onclick="alert(1)" style="color:red" class="x">ok</p>')).toBe(
    "<p>ok</p>",
  );
});

test("strips disallowed tags (img, iframe, h1) but keeps their text content", () => {
  expect(sanitizeChangelogContenu('<img src="x" onerror="alert(1)" />')).toBe("");
  expect(sanitizeChangelogContenu('<iframe src="https://example.org"></iframe>')).toBe("");
  expect(sanitizeChangelogContenu("<h1>titre</h1>")).toBe("titre");
});

test("links keep http/https/mailto hrefs and get rel/target enforced", () => {
  expect(sanitizeChangelogContenu('<a href="https://example.org">lien</a>')).toBe(
    '<a href="https://example.org" rel="noopener noreferrer" target="_blank">lien</a>',
  );
  expect(sanitizeChangelogContenu('<a href="mailto:a@b.fr">écrire</a>')).toBe(
    '<a href="mailto:a@b.fr" rel="noopener noreferrer" target="_blank">écrire</a>',
  );
});

test("drops javascript: hrefs", () => {
  expect(sanitizeChangelogContenu('<a href="javascript:alert(1)">lien</a>')).toBe(
    '<a rel="noopener noreferrer" target="_blank">lien</a>',
  );
});
