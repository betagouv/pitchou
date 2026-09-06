import { expect, test } from "vitest";
import { sanitizeCnpnEmailHtml } from "./cnpnEmail.ts";

test("conserve la mise en forme et les tableaux du mail CNPN", () => {
  const html = sanitizeCnpnEmailHtml(
    '<h2 style="text-align:center;color:red">Titre</h2><p style="text-align:justify">Texte</p><table border="1" cellpadding="6"><tr><th>Espèce</th><td>Hirondelle</td></tr></table>',
  );

  expect(html).toContain('<h2 style="text-align:center">Titre</h2>');
  expect(html).toContain('<p style="text-align:justify">Texte</p>');
  expect(html).toContain('<table border="1" cellpadding="6">');
  expect(html).toContain("<th>Espèce</th>");
});

test("retire scripts, gestionnaires d'évènement et images", () => {
  const html = sanitizeCnpnEmailHtml(
    '<p onclick="alert(1)">Bonjour<script>alert(1)</script></p><img src="https://tracker.test/pixel">',
  );

  expect(html).toBe("<p>Bonjour</p>");
});
