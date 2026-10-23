import "@gouvfr/dsfr/dist/dsfr.min.css";
import "../../app.css";
import "./monitoring.css";
import "./mails.css";
import { afterEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import MailControls from "./MailControls.svelte";
import MailDetails from "./MailDetails.svelte";
import MailTimeline from "./MailTimeline.svelte";
import MailTable from "./MailTable.svelte";
import type { EmailDetail, EmailFilters } from "@pitchou/types/adminEmails.ts";

const filters: EmailFilters = {
  search: "",
  kind: "",
  status: "",
  source: "",
  environment: "",
  tracking: "",
  dateField: "due_at",
  dateFrom: "",
  dateTo: "",
  sort: "due_at",
  order: "desc",
  overdue: false,
  page: 1,
  email: "",
};
afterEach(cleanup);

test("custom panels apply keyboard choices immediately and debounce search without an apply button", async () => {
  const onChange = vi.fn(),
    onReset = vi.fn();
  render(MailControls, { filters, onChange, onReset });
  await page.getByRole("button", { name: "Filtrer", exact: true }).click();
  await page.getByRole("combobox", { name: "Type", exact: true }).click();
  await userEvent.keyboard("{End}{Enter}");
  expect(onChange).toHaveBeenLastCalledWith({ kind: "novelty", search: "" });
  await page.getByRole("combobox", { name: "État", exact: true }).click();
  await userEvent.keyboard("{Escape}");
  await expect.element(page.getByRole("listbox")).not.toBeInTheDocument();
  await expect
    .element(page.getByRole("button", { name: "Appliquer", exact: true }))
    .not.toBeInTheDocument();
  await page.getByRole("searchbox", { name: "Rechercher un mail" }).fill("Projet");
  expect(onChange).toHaveBeenCalledTimes(1);
  await expect.poll(() => onChange.mock.calls.at(-1)?.[0]).toEqual({ search: "Projet" });
  await page.getByRole("button", { name: "Trier", exact: true }).click();
  await page.getByRole("button", { name: "Dossier", exact: true }).click();
  expect(onChange).toHaveBeenLastCalledWith({ sort: "dossier", order: "asc", search: "Projet" });
  await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
  expect(onReset).toHaveBeenCalledOnce();
});
test("incomplete or impossible French dates do not change the query", async () => {
  const onChange = vi.fn();
  render(MailControls, { filters, onChange, onReset: vi.fn() });
  await page.getByRole("button", { name: "Filtrer", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Du, heure de Paris", exact: true });
  await input.fill("31/02/2026");
  expect(onChange).not.toHaveBeenCalled();
  await expect.element(input).toHaveAttribute("aria-invalid", "true");
  await input.fill("23/10/2026");
  expect(onChange).toHaveBeenLastCalledWith({ dateFrom: "2026-10-23" });
});
const detail: EmailDetail = {
  row: {
    id: "record",
    source: "cnpn",
    kind: "cnpn",
    status: "sent",
    environment: "unrecorded",
    dossier: 12,
    dossier_name: "Projet",
    personne: null,
    first_names: null,
    last_name: null,
    email: "cnpn@test.fr",
    due_at: "2026-10-23T06:00:00Z",
    sent_at: "2026-10-23T06:01:00Z",
    created_at: "2026-10-23T06:00:00Z",
    retry_at: null,
    attempt_count: null,
    last_error: null,
    cancellation_reason: null,
    provider_message_id: "provider",
    subject: "Saisine CNPN",
    delivered_at: null,
    opened_at: null,
  },
  history: [],
  html: "<p>Message enregistré</p>",
  recipients: ["cnpn@test.fr"],
  cc: [],
  sentBy: "actor@test.fr",
  attachments: [],
  firstAttemptAt: null,
  readReceiptSentAt: null,
};
test("row keyboard activation and blank-cell clicks use the same detail action", async () => {
  const onOpen = vi.fn();
  const { container } = render(MailTable, { rows: [detail.row], onOpen });
  const button = page.getByRole("button", { name: /Détails du mail/u });
  await button.click();
  expect(onOpen.mock.calls[0][0]).toEqual(detail.row);
  (container.querySelector("td:last-child") as HTMLElement).click();
  expect(onOpen).toHaveBeenCalledTimes(2);
});
test("details reuse the admin modal inside a native modal dialog with trapped and restored focus", async () => {
  const trigger = document.createElement("button");
  trigger.textContent = "Origine";
  document.body.append(trigger);
  trigger.focus();
  const close = vi.fn();
  const rendered = render(MailDetails, { detail, onClose: close, trigger });
  const dialog = document.querySelector("dialog")!;
  expect(document.querySelectorAll('dialog, [role="dialog"]')).toHaveLength(1);
  expect(dialog.matches(":modal")).toBe(true);
  const closeButton = page.getByRole("button", { name: "Fermer", exact: true });
  await expect.element(closeButton).toHaveFocus();
  await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
  expect(dialog.contains(document.activeElement)).toBe(true);
  const frame = document.querySelector<HTMLIFrameElement>("iframe")!;
  expect(frame.srcdoc).toContain("Message enregistré");
  expect(frame.sandbox.contains("allow-scripts")).toBe(false);
  expect(frame.sandbox.contains("allow-same-origin")).toBe(false);
  await page.getByRole("tab", { name: /Historique/u }).click();
  await expect.element(page.getByText("Aucun événement enregistré.")).toBeInTheDocument();
  await userEvent.keyboard("{ArrowRight}");
  await expect
    .element(page.getByRole("tab", { name: "Informations", exact: true }))
    .toHaveAttribute("aria-selected", "true");
  await userEvent.keyboard("{Escape}");
  expect(close).toHaveBeenCalledOnce();
  rendered.unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});

test("timeline suppresses global list counters and keeps long identifiers inside a separate content column", async () => {
  const style = document.createElement("style");
  style.textContent = 'ol > li::before {content:"1.";position:absolute;}';
  document.head.append(style);
  const { container } = render(MailTimeline, {
    attempts: true,
    history: [
      {
        id: "history",
        notification_id: "mail",
        event: "sent",
        environment: "preview",
        occurred_at: new Date(),
        attempt: 2,
        details: { providerMessageId: "provider-".repeat(50) },
      },
    ],
  });
  const item = container.querySelector("li")!;
  expect(getComputedStyle(item, "::before").content).toBe("none");
  expect(getComputedStyle(item, "::marker").content).toBe('""');
  const marker = container.querySelector(".event-rail span")!.getBoundingClientRect(),
    title = container.querySelector("strong")!.getBoundingClientRect();
  expect(marker.right).toBeLessThan(title.left);
  expect(getComputedStyle(container.querySelector(".event-diagnostic")!).overflowWrap).toBe(
    "anywhere",
  );
  style.remove();
});
