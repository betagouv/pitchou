import { describe, expect, it } from "vitest";

import { checkResponse } from "./adminResponse.ts";
import { AccessDeniedError } from "./adminEspeces.ts";

describe("checkResponse", () => {
  it("does nothing for a successful response", async () => {
    await expect(checkResponse(new Response("ok"), "du chargement des dossiers")).resolves.toBe(
      undefined,
    );
  });

  it("surfaces the server's own message when available", async () => {
    const response = new Response(JSON.stringify({ message: "Numéro DN déjà utilisé." }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });

    await expect(checkResponse(response, "de la création du dossier")).rejects.toThrow(
      "Numéro DN déjà utilisé.",
    );
  });

  it("throws AccessDeniedError on a 403", async () => {
    const response = new Response(null, { status: 403 });

    await expect(checkResponse(response, "du chargement des dossiers")).rejects.toBeInstanceOf(
      AccessDeniedError,
    );
  });

  // Every caller passes an action already carrying its preposition — « du
  // chargement des dossiers », « de la création du dossier » — so the template
  // must not add a second « de ».
  it("builds a grammatical fallback message when the body carries none", async () => {
    const response = new Response("Bad Gateway", { status: 502 });

    await expect(checkResponse(response, "du chargement des dossiers")).rejects.toThrow(
      "Erreur 502 lors du chargement des dossiers.",
    );
  });
});
