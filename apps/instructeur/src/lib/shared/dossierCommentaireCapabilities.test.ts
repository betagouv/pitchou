import { afterEach, expect, test, vi } from "vitest";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { createDossierCommentaireCapabilities } from "./dossierCommentaireCapabilities.ts";

const urls = {
  listerCommentaires: "",
  ajouterCommentaire: "",
  modifierCommentaire: "",
  listerActionsDossier: "",
  supprimerCommentaire: "/dossier/:dossierId/commentaires?cap=author-cap",
};

afterEach(() => vi.unstubAllGlobals());

test("comment deletion sends only the ID to the capability URL", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  await expect(
    createDossierCommentaireCapabilities(urls).supprimerCommentaire!(42 as DossierId, "comment-id"),
  ).resolves.toBeUndefined();
  expect(fetch).toHaveBeenCalledWith("/dossier/42/commentaires?cap=author-cap", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "comment-id" }),
  });
});

test("a rejected deletion is not reported as success", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 403, statusText: "Forbidden" })),
  );
  await expect(
    createDossierCommentaireCapabilities(urls).supprimerCommentaire!(42 as DossierId, "comment-id"),
  ).rejects.toThrow("403");
});

test.each(["", "/commentaires?cap=missing-dossier-placeholder"])(
  "invalid delete URLs do not grant a mutation capability: %s",
  (supprimerCommentaire) => {
    expect(
      createDossierCommentaireCapabilities({ ...urls, supprimerCommentaire }).supprimerCommentaire,
    ).toBeUndefined();
  },
);
