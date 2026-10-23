import { expect, test } from "vitest";
import { emailPreviewHtml } from "./preview.ts";
import { notificationEmailMessage } from "../../dossierNotificationEmails/message.ts";
const site = "https://pitchou.test";

test.each(["arrival", "assignment", "novelty"] as const)(
  "preserves recorded %s branding, inline styles, tables and links",
  (kind) => {
    const message = notificationEmailMessage(
      {
        id: "sample",
        kind,
        email: "recipient@test.fr",
        dossier: 46,
        demarche_numerique_number: null,
        name: "Projet <test>",
        enjeu: false,
      },
      site,
    );
    const original = message.htmlContent;
    const preview = emailPreviewHtml(original, site);
    expect(preview).toContain(
      '<img src="https://pitchou.test/images/pitchou-logo-email.png" alt="Pitchou" width="209" height="40"',
    );
    for (const value of [
      "background-color:#f6f6fe",
      "border-top:4px solid #6b75d3",
      "background-color",
      'bgcolor="#ececfe"',
      "padding:28px 24px 32px",
      "font-family:Arial,Helvetica,sans-serif",
      "font-size:24px",
      "color:#252e7e",
      'href="https://pitchou.test/dossier/46?tab=historique"',
      'href="https://pitchou.test/parametres/notifications"',
    ])
      expect(preview).toContain(value);
    expect(preview).toContain("Projet &lt;test&gt;");
    expect(message.htmlContent).toBe(original);
  },
);
test("blocks executable markup, embedding, external resources, tracking and unsafe styles", () => {
  const result = emailPreviewHtml(
    `<head><base href="https://evil.test/"><meta http-equiv="refresh" content="0;url=https://evil.test"></head><script>parent.alert('secret')</script><form action="https://evil.test"><input autofocus onfocus="alert(1)"></form><iframe src="https://evil.test"></iframe><object data="https://evil.test"></object><svg onload="alert(1)"></svg><style>@import 'https://evil.test/style';body{display:none}</style><p onclick="alert(1)" style="color:#161616;background-image:url(https://evil.test/pixel);position:fixed;font-family:expression(alert(1));padding:20px">Safe</p><img src="https://evil.test/pixel"><img src="https://pitchou.test/images/pitchou-logo-email.png?tracking=1"><img src="data:image/svg+xml,evil"><img src="https://pitchou.test/images/pitchou-logo-email.png" srcset="https://evil.test/other 2x" onerror="alert(1)"><a href="javascript:alert(1)">Unsafe</a><a href="https://pitchou.test/dossier/46?tab=historique" target="_top">Dossier</a>`,
    site,
  );
  expect(result).not.toMatch(
    /evil\.test|parent\.|secret|<script|<form|<input|<iframe|<object|<svg|<style|onfocus|onclick|onerror|javascript:|tracking=|srcset|expression\(|position:/u,
  );
  expect(result).toContain('style="color:#161616;padding:20px"');
  expect(result).toContain('target="_blank" rel="noopener noreferrer"');
  expect(result).toContain("default-src 'none'; script-src 'none'");
  expect(result).toContain("base-uri 'none'; form-action 'none'");
  expect(result.match(/<img /gu)).toHaveLength(1);
});
test.each([
  "https://evil.test/images/pitchou-logo-email.png",
  "https://pitchou.test.evil.test/images/pitchou-logo-email.png",
  "https://user@pitchou.test/images/pitchou-logo-email.png",
  "//pitchou.test/images/pitchou-logo-email.png",
  "https://pitchou.test/images/pitchou-logo-email.png#tracking",
])("does not allow an arbitrary asset %s", (src) => {
  expect(emailPreviewHtml(`<img src="${src}" alt="untrusted">`, site)).not.toContain("<img");
});
test("preserves safe historical CNPN formatting without granting notification-only trust", () => {
  const html =
    '<p style="text-align:center;color:#252e7e;font-weight:bold">CNPN</p><table width="100%" cellpadding="4"><tr><td style="padding:8px;border:1px solid #dddddd">Dossier</td></tr></table>';
  expect(emailPreviewHtml(html, site)).toContain(html);
  expect(
    emailPreviewHtml(
      '<img src="https://pitchou.test/images/pitchou-logo-email.png">',
      "javascript:alert(1)",
    ),
  ).not.toContain("<img");
});
