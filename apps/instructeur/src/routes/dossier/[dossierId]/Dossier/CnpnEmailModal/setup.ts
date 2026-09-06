import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/svelte";

vi.mock(import("../cnpnEmailDraft.ts"), () => ({
  createCnpnEmailDraft: vi.fn().mockResolvedValue({
    subject: "Saisine du CNPN - Projet test",
    htmlBody: "<p>Bonjour</p>",
  }),
  updateCnpnAttachmentList: (html: string) => html,
}));
vi.mock(import("../sendCnpnEmail.ts"), () => ({ sendCnpnEmail: vi.fn() }));
vi.mock(import("$lib/dossier/dossier.ts"), () => ({ refreshDossierFull: vi.fn() }));
vi.mock("$env/dynamic/public", () => ({ env: { PUBLIC_PITCHOU_ENV: "" } }));

import { dossier } from "./fixtures.ts";

// Dynamic imports keep component dependencies behind Vitest's mock registration.
export const { default: CnpnEmailModal } = await import("../CnpnEmailModal.svelte");
export const { createCnpnEmailDraft } = await import("../cnpnEmailDraft.ts");
export const { sendCnpnEmail } = await import("../sendCnpnEmail.ts");
export const { refreshDossierFull } = await import("$lib/dossier/dossier.ts");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  vi.mocked(createCnpnEmailDraft).mockReset().mockResolvedValue({
    subject: "Saisine du CNPN - Projet test",
    htmlBody: "<p>Bonjour</p>",
  });
  vi.mocked(sendCnpnEmail)
    .mockReset()
    .mockResolvedValue({} as never);
  vi.mocked(refreshDossierFull).mockReset().mockResolvedValue(dossier);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
