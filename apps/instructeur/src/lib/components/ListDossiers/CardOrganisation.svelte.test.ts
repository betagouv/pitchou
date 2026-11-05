import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import CardDossier from "./CardDossier.svelte";
import { makeDossier } from "./testHelpers.ts";
const dossier = makeDossier({ name: "Projet des marais" });
const cardProps = () => ({
  notificationViewed: true,
  dossierFollowedByCurrentInstructeur: false,
  currentInstructeurFollowsDossier: vi.fn(),
  currentInstructeurLeavesDossier: vi.fn(),
});
afterEach(cleanup);

test.each([false, true])(
  "organisation names and uncertainty remain visible in readOnly=%s lists",
  async (readOnly) => {
    const props = cardProps();
    const organisation = {
      type: "organisation" as const,
      name: "Syndicat des marais",
      address: null,
      siren: null,
      verification_status: "source_declared" as const,
      source: "onagre",
      source_reference: "ORG-44",
      verification_evidence: null,
    };
    const { rerender } = render(CardDossier, {
      ...props,
      readOnly,
      dossier: { ...dossier, porteur_de_projet: organisation },
    });
    expect(screen.getByText("Syndicat des marais")).toBeTruthy();
    expect(screen.getByText("À vérifier").getAttribute("title")).toBe(
      "Organisation déclarée dans Onagre — à vérifier",
    );
    await rerender({
      ...props,
      readOnly,
      dossier: {
        ...dossier,
        porteur_de_projet: {
          ...organisation,
          verification_status: "verified",
          verification_evidence: "Registre officiel",
        },
      },
    });
    expect(screen.getByText("Syndicat des marais")).toBeTruthy();
    expect(screen.queryByText("À vérifier")).toBeNull();
    expect(screen.getByText("Établissement à confirmer").getAttribute("title")).toBe(
      "Organisation vérifiée — établissement à confirmer",
    );
  },
);
