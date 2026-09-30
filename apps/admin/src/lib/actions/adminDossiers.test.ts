import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("$lib/upload/uploadToStorage.ts"), () => ({
  uploadFichiers: vi.fn(),
}));

import { uploadFichiers } from "$lib/upload/uploadToStorage.ts";
import { createDossier, updateDossier, uploadPieceJointe } from "./adminDossiers.ts";
import { emptyDossierCreationAttachments } from "./adminDossierUploads.ts";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(
    new Response(JSON.stringify({ id: 42 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  // One reference per file, in order, so the mapping back to fields is observable.
  vi.mocked(uploadFichiers)
    .mockReset()
    .mockImplementation(async (files) =>
      files.map((file, index) => ({ id: `id-${index}` as never, name: file.name })),
    );
});

afterEach(() => vi.unstubAllGlobals());

function jsonBody(call: number) {
  const [url, request] = fetchMock.mock.calls[call];
  expect(request.headers).toEqual({ "Content-Type": "application/json" });
  return { url, body: JSON.parse(request.body as string) };
}

describe("updateDossier", () => {
  it("sends the files to storage, then the fields with the references under uploads", async () => {
    const payload = { columns: { name: "Projet modifié" } };
    const speciesFile = new File(["species"], "species.xlsx");
    const attachment = new File(["attachment"], "annexe.pdf", { type: "application/pdf" });

    await updateDossier(42, payload, speciesFile, [attachment]);

    expect(uploadFichiers).toHaveBeenCalledWith([speciesFile, attachment]);
    const { url, body } = jsonBody(0);
    expect(url).toBe("/api/dossiers/42");
    expect(body).toEqual({
      ...payload,
      uploads: {
        speciesFile: { id: "id-0", name: "species.xlsx" },
        attachments: [{ id: "id-1", name: "annexe.pdf" }],
      },
    });
  });

  it("sends the fields alone when there is no file", async () => {
    await updateDossier(42, { columns: { name: "x" } });

    expect(uploadFichiers).not.toHaveBeenCalled();
    expect(jsonBody(0).body).toEqual({ columns: { name: "x" } });
  });
});

describe("createDossier", () => {
  it("maps each attachment field to its uploads property", async () => {
    const speciesFile = new File(["s"], "especes.ods");
    const cv = new File(["c"], "cv.pdf");
    const plan = new File(["p"], "plan.pdf");
    const attachments = {
      ...emptyDossierCreationAttachments(),
      intervenantCv: [cv],
      windFarmPlan: [plan],
    };
    const payload = {
      name: "Projet",
      depot_date: "2026-01-01",
      phase: null,
      relations: {} as never,
    };

    await createDossier(payload, speciesFile, attachments);

    expect(uploadFichiers).toHaveBeenCalledWith([speciesFile, plan, cv]);
    expect(jsonBody(0).body).toEqual({
      ...payload,
      uploads: {
        speciesFile: { id: "id-0", name: "especes.ods" },
        windFarmPlanAttachments: [{ id: "id-1", name: "plan.pdf" }],
        intervenantCvAttachments: [{ id: "id-2", name: "cv.pdf" }],
      },
    });
  });
});

describe("uploadPieceJointe", () => {
  it("sends the file to storage, then attaches its reference", async () => {
    const file = new File(["x"], "note.pdf");

    await uploadPieceJointe(7, file);

    expect(uploadFichiers).toHaveBeenCalledWith([file]);
    const { url, body } = jsonBody(0);
    expect(url).toBe("/api/dossiers/7/pieces-jointes");
    expect(body).toEqual({ file: { id: "id-0", name: "note.pdf" } });
  });
});
