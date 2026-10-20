import { expect, test } from "vitest";
import { cleanHtmlText } from "./text.ts";

test("cleans citation markup and named entities", () => {
  expect(cleanHtmlText(" <p>A&nbsp;&amp; B &quot;C&quot; &apos;D&apos; &lt;E&gt;</p> ")).toBe(
    "A & B \"C\" 'D' <E>",
  );
});

test.each([
  ["&#233;", "é"],
  ["&#xE9;", "é"],
  ["&#39;", "'"],
  ["&#128038;", "🐦"],
  ["&#x1F426;", "🐦"],
  ["&#x10FFFF;", "\u{10FFFF}"],
])("decodes Unicode entity %s", (input, expected) => {
  expect(cleanHtmlText(input)).toBe(expected);
});

test.each(["&#1114112;", "&#x110000;", "&#55296;", "&#xDFFF;", `&#${"9".repeat(400)};`])(
  "preserves invalid entity %s without failing the import",
  (input) => {
    expect(cleanHtmlText(input)).toBe(input);
  },
);

test("does not turn encoded markup into stripped tags", () => {
  expect(cleanHtmlText("&lt;p&gt;text&lt;/p&gt;")).toBe("<p>text</p>");
});
