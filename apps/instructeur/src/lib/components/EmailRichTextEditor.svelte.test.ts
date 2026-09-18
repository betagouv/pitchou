import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../app.css";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import type { Editor } from "@tiptap/core";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import { sanitizeCnpnEmailHtml } from "@pitchou/server/cnpnEmail.ts";
import {
  createCnpnEmailDraft,
  updateCnpnAttachmentList,
} from "../../routes/dossier/[dossierId]/Dossier/cnpnEmailDraft.ts";
import EmailRichTextEditor from "./EmailRichTextEditor.svelte";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-fr-theme");
});

test("actualise Annuler et Rétablir après chaque transaction", async () => {
  const { container } = render(EmailRichTextEditor, { html: "<p>Bonjour</p>" });
  const undo = page.getByRole("button", { name: "Annuler", exact: true });
  const redo = page.getByRole("button", { name: "Rétablir", exact: true });
  await expect.element(undo).toBeDisabled();
  await expect.element(redo).toBeDisabled();

  await page.getByRole("button", { name: "Justifier", exact: true }).click();
  await expect.element(undo).toBeEnabled();
  await expect.element(redo).toBeDisabled();
  expect(container.querySelector(".tiptap p")).toHaveStyle({ textAlign: "justify" });

  await undo.click();
  await expect.element(undo).toBeDisabled();
  await expect.element(redo).toBeEnabled();
  expect(container.querySelector(".tiptap p")).not.toHaveAttribute("style");

  await redo.click();
  await expect.element(undo).toBeEnabled();
  await expect.element(redo).toBeDisabled();
  expect(container.querySelector(".tiptap p")).toHaveStyle({ textAlign: "justify" });
});

test("conserve les tableaux et synchronise les PJ après justification et nettoyage du mail", async () => {
  const { htmlBody } = await createCnpnEmailDraft(
    {
      name: "Projet test",
      especesImpactees: {
        impacts: [
          {
            espece: { nomVernaculaire: "Hirondelle", nomScientifique: "Hirundo rustica" },
            typeImpact: {
              identifiantPitchou: "destruction",
              libelle: "Destruction",
              criteriaAllowed: ["Nombre d'individus"],
            },
            nombreIndividus: "2",
          },
        ],
      },
    } as unknown as DossierFull,
    "instructeur@example.com",
  );
  const { container, rerender } = render(EmailRichTextEditor, {
    html: updateCnpnAttachmentList(htmlBody, ["ancien.pdf"]),
  });
  const element = container.querySelector<HTMLElement & { editor: Editor }>(".tiptap")!;
  const editor = element.editor;
  editor.commands.selectAll();
  await page.getByRole("button", { name: "Justifier", exact: true }).click();

  const formatted = editor.getHTML();
  expect(formatted).toContain('style="text-align: justify;"');
  const updated = updateCnpnAttachmentList(formatted, ["nouveau <CNPN>.pdf"]);
  expect(updated).not.toContain("ancien.pdf");
  expect(updated).toContain("nouveau &lt;CNPN&gt;.pdf");
  await rerender({ html: updated });

  const sanitized = sanitizeCnpnEmailHtml(editor.getHTML());
  const document = new DOMParser().parseFromString(sanitized, "text/html");
  const tables = document.querySelectorAll("table");
  expect(tables).toHaveLength(2);
  for (const table of tables) {
    expect(table).toHaveAttribute("border", "1");
    expect(table).toHaveAttribute("cellpadding", "6");
    expect(table).toHaveAttribute("cellspacing", "0");
    expect(table).toHaveAttribute("width", "100%");
  }
  expect(document.body.textContent).toContain("instructeur@example.com");
  expect(tables[1].textContent).toContain("Hirundo rustica");
  expect(tables[1].querySelectorAll("td")).toHaveLength(3);
  expect(tables[1].querySelectorAll("td")[1].textContent).toBe("2");
  const heading = Array.from(document.querySelectorAll("p")).find((paragraph) =>
    paragraph.textContent?.includes("Liste des éléments transmis en PJ"),
  )!;
  expect(heading.style.textAlign).toBe("justify");
  expect(heading.nextElementSibling?.textContent).toBe("nouveau <CNPN>.pdf");

  await rerender({ html: updateCnpnAttachmentList(sanitized, []) });
  expect(editor.getText()).toContain("Aucune pièce jointe sélectionnée");
  expect(editor.getText()).not.toContain("nouveau <CNPN>.pdf");
});

test("the mail sheet keeps dark text on white in dark mode, as the mail will be read", () => {
  document.documentElement.dataset.frTheme = "dark";
  const { container } = render(EmailRichTextEditor, {
    html: "<p>Bonjour</p><table><tr><th>Pièce</th><td>Saisine</td></tr></table>",
  });
  const sheet = container.querySelector<HTMLElement>(".tiptap")!.parentElement!;
  expect(getComputedStyle(sheet).backgroundColor).toBe("rgb(255, 255, 255)");
  expect(getComputedStyle(container.querySelector(".tiptap p")!).color).toBe("rgb(22, 22, 22)");
  const th = container.querySelector(".tiptap th")!;
  expect(getComputedStyle(th).backgroundColor).toBe("rgb(246, 246, 246)");
  expect(getComputedStyle(th).borderTopColor).toBe("rgb(221, 221, 221)");
});
