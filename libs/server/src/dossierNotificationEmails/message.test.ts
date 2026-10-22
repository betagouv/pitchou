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
  expect(message.htmlContent).toContain('href="https://pitchou.test/parametres/notifications"');
  expect(message.htmlContent).not.toContain("cap=");
  expect(message.headers).toEqual({ idempotencyKey: "event-id" });
});

test("keeps an undetermined enjeu distinct from an explicit absence of enjeu", () => {
  const context = {
    id: "event-id",
    kind: "novelty" as const,
    email: "recipient@test.fr",
    dossier: 42,
    demarche_numerique_number: null,
    name: null,
  };
  expect(
    notificationEmailMessage({ ...context, enjeu: null }, "https://pitchou.test").subject,
  ).toBe("Nouveauté: 42 - Enjeu à déterminer - Dossier sans titre");
  expect(
    notificationEmailMessage({ ...context, enjeu: false }, "https://pitchou.test").subject,
  ).toContain("Sans enjeu");
});

test("arrival mail uses the requested subject and concise body without enjeu", () => {
  const message = notificationEmailMessage(
    {
      id: "arrival-event",
      kind: "arrival",
      email: "member@test.fr",
      dossier: 42,
      demarche_numerique_number: 123456,
      name: "Projet <test>",
      enjeu: true,
    },
    "https://pitchou.test",
  );
  expect(message.subject).toBe("Nouveau dossier: 123456 - Projet <test>");
  expect(message.subject).not.toContain("enjeu");
  expect(message.htmlContent).toContain(
    "Un nouveau dossier vient d’arriver dans Pitchou et attend d'être suivi par un-e instructeur-trice:",
  );
  expect(message.htmlContent).toContain("123456 - Projet &lt;test&gt;");
  expect(message.htmlContent).toContain('href="https://pitchou.test/parametres/notifications"');
  expect(message.headers).toEqual({ idempotencyKey: "arrival-event" });
});
