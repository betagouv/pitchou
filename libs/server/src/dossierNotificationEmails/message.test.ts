import { expect, test } from "vitest";
import { notificationEmailMessage } from "./message.ts";

test("escapes dossier names and includes dossier and settings links without capabilities", () => {
  const message = notificationEmailMessage(
    {
      id: "event-id",
      kind: "assignment",
      email: "recipient@test.fr",
      dossier: 42,
      demarche_numerique_number: 123456,
      name: '<script>"A&B"</script>',
      enjeu: true,
    },
    "https://pitchou.test",
  );
  expect(message.subject).toBe('Attribution dossier: 123456 - À enjeu - <script>"A&B"</script>');
  expect(message.htmlContent).toContain("&lt;script&gt;&quot;A&amp;B&quot;&lt;/script&gt;");
  expect(message.htmlContent).toContain('href="https://pitchou.test/dossier/42"');
  expect(message.htmlContent).toContain('href="https://pitchou.test/parametres"');
  expect(message.htmlContent).not.toContain("cap=");
  expect(message.headers).toEqual({ idempotencyKey: "event-id" });
});
