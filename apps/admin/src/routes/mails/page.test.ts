import type { UserId } from "@pitchou/types/permissions.ts";
import { render } from "svelte/server";
import { expect, test } from "vitest";
import Page from "./+page.svelte";

test("affiche les statistiques des mails CNPN", () => {
  const { body } = render(Page, {
    props: {
      data: {
        user: {
          email: "admin@example.com",
          name: "Admin",
          id: 1 as UserId,
          active: true,
          first_names: "",
          last_name: "",
          first_login_at: null,
          last_login_at: null,
          groupes: [],
          permissions: ["admin:access"],
        },
        isAdmin: true,
        maxUploadSizeBytes: 1024 * 1024 * 1024,
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
