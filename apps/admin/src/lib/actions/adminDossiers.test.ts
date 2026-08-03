import { afterEach, describe, expect, it, vi } from "vitest";

import { updateDossier } from "./adminDossiers.ts";

afterEach(() => vi.unstubAllGlobals());

describe("updateDossier", () => {
  it("submits dossier fields and files in one multipart request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ dossier: { id: 42 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const payload = { columns: { name: "Projet modifié" } };
    const speciesFile = new File(["species"], "species.xlsx");
    const attachment = new File(["attachment"], "annexe.pdf", { type: "application/pdf" });

    await updateDossier(42, payload, speciesFile, [attachment]);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/dossiers/42");
    expect(request).toMatchObject({ method: "PUT", headers: undefined });
    expect(request.body).toBeInstanceOf(FormData);
    const form = request.body as FormData;
    expect(JSON.parse(form.get("payload") as string)).toEqual(payload);
    expect(form.get("speciesFile")).toBe(speciesFile);
    expect(form.getAll("attachments")).toEqual([attachment]);
  });
});
