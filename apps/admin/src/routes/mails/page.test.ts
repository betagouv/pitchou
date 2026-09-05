import { render } from "svelte/server";
import { expect, test } from "vitest";
import Page from "./+page.svelte";

test("affiche les statistiques des mails CNPN", () => {
  const { body } = render(Page, {
    props: {
      data: {
        user: { email: "admin@example.com", name: "Admin" },
        isAdmin: true,
        stats: { sentCount: 12, deliveredCount: 10, openedCount: 7 },
      },
    },
  });

  expect(body).toContain("Mails envoyés");
  expect(body).toContain("Mails reçus par le CNPN");
  expect(body).toContain("Mails ouverts");
  expect(body).toMatch(/>12</);
  expect(body).toMatch(/>10</);
  expect(body).toMatch(/>7</);
});
