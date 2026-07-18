import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFichierContent } from "@pitchou/server/database/fichier.ts";
import { downloadFichierResponse } from "./fichier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

vi.mock(import("@pitchou/server/database/fichier.ts"), () => ({
  loadFichierContent: vi.fn(),
}));

const load = vi.mocked(loadFichierContent);

beforeEach(() => {
  load.mockReset();
});

const id = "00000000-0000-0000-0000-000000000001" as FileId;

describe("downloadFichierResponse", () => {
  it("throws a 404 SvelteKit error when the fichier is not found", async () => {
    load.mockResolvedValue(null);
    await expect(downloadFichierResponse(id)).rejects.toMatchObject({ status: 404 });
  });

  it("returns body and content-length for S3 files", async () => {
    const bytes = Buffer.from("hello world");
    const body = Readable.from([bytes]);
    load.mockResolvedValue({
      nom: "doc.pdf",
      media_type: "application/pdf",
      body,
      taille: bytes.byteLength,
    });

    const res = await downloadFichierResponse(id);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-length")).toBe(String(bytes.byteLength));
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.equals(bytes)).toBe(true);
  });

  it("streams Readable bodies via Readable.toWeb", async () => {
    const body = Readable.from([Buffer.from("abc"), Buffer.from("def")]);
    load.mockResolvedValue({
      nom: "stream.bin",
      media_type: "application/octet-stream",
      body,
      taille: 6,
    });

    const res = await downloadFichierResponse(id);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-length")).toBe("6");
    const text = await res.text();
    expect(text).toBe("abcdef");
  });

  it("emits a single content-disposition header with ASCII filename and RFC5987 filename*", async () => {
    load.mockResolvedValue({
      nom: "été 2025.pdf",
      media_type: "application/pdf",
      body: Readable.from([Buffer.from("x")]),
      taille: 1,
    });
    const res = await downloadFichierResponse(id);
    const cd = res.headers.get("content-disposition") ?? "";

    // No comma between two attachment= directives — undici joins repeated headers with ", ".
    expect(cd).not.toMatch(/,\s*attachment/i);
    expect(cd).toMatch(/^attachment;/i);
    // Diacritics stripped in the ASCII filename.
    expect(cd).toMatch(/filename="ete 2025\.pdf"/);
    // Original name encoded in filename*.
    expect(cd).toMatch(/filename\*=UTF-8''/);
    expect(cd).toContain(encodeURI("été 2025.pdf"));
  });

  it("omits content-length when taille is undefined (unknown size stream)", async () => {
    load.mockResolvedValue({
      nom: "doc.pdf",
      media_type: "application/pdf",
      body: Readable.from([Buffer.from("x")]),
    });
    const res = await downloadFichierResponse(id);
    expect(res.headers.get("content-length")).toBeNull();
    await res.text();
  });
});
