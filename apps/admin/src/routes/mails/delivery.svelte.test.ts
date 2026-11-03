import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import type { EmailDetail } from "@pitchou/types/adminEmails.ts";
import MailDetails from "./MailDetails.svelte";

afterEach(cleanup);
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

test("notification details show the reported failure reason as text and preserve acceptance history", async () => {
  const reason = '511 "User Unknown" <img src=x onerror="alert(1)">';
  render(MailDetails, {
    detail: {
      ...detail,
      row: {
        ...detail.row,
        source: "notification",
        kind: "arrival",
        status: "failed",
        last_error: reason,
      },
      history: [
        {
          id: "accepted",
          notification_id: "record",
          event: "sent",
          environment: "production",
          occurred_at: "2026-10-28T15:51:56Z",
          attempt: 1,
          details: {},
        },
        {
          id: "failure",
          notification_id: "record",
          event: "hard_bounce",
          environment: "production",
          occurred_at: "2026-10-28T15:51:59Z",
          attempt: 0,
          details: { reason, providerMessageId: "provider" },
        },
      ],
    },
    onClose: vi.fn(),
    trigger: null,
  });
  await expect.element(page.getByText("Échec de livraison signalé", { exact: true })).toBeVisible();
  await expect.element(page.getByText("Pris en charge par Brevo", { exact: true })).toBeVisible();
  await expect
    .element(page.getByText("Livraison refusée définitivement", { exact: true }))
    .toBeVisible();
  await expect.element(page.getByText(reason, { exact: true })).toBeVisible();
  expect(document.querySelector(".mail-timeline img")).toBeNull();
});
