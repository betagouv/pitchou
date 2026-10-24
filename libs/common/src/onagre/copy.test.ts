import { describe, expect, it } from "vitest";
import { decodeCopyValue, readCopyHeader, readCopyRow } from "./copy.ts";
import { copyLines } from "./lines.ts";

describe("Onagre COPY decoding", () => {
  it("distinguishes null, empty and escaped literal backslashes", () => {
    expect(decodeCopyValue("\\N")).toBeNull();
    expect(decodeCopyValue("")).toBe("");
    expect(decodeCopyValue("\\\\N")).toBe("\\N");
    expect(decodeCopyValue("a\\tb\\nc\\r\\303\\251")).toBe("a\tb\nc\ré");
  });
  it("reads only Onagre COPY records and rejects a broken row", () => {
    expect(readCopyHeader("DROP TABLE dossier;")).toBeNull();
    expect(readCopyHeader("COPY public.dossier (id) FROM stdin;")).toBeNull();
    expect(readCopyHeader("COPY onagre.demandes (demandesid, projetid) FROM stdin;"))?.toEqual({
      name: "demandes",
      columns: ["demandesid", "projetid"],
    });
    expect(readCopyRow("7\t\\N", ["id", "name"])).toEqual({ id: "7", name: null });
    expect(() => readCopyRow("7", ["id", "name"])).toThrow();
  });
  it("preserves multibyte characters split across chunks and literal CR", async () => {
    async function* chunks() {
      const buffer = Buffer.from("élève\rtexte\nfin");
      for (const byte of buffer) yield Buffer.from([byte]);
    }
    const lines = [];
    for await (const line of copyLines(chunks())) lines.push(line);
    expect(lines).toEqual(["élève\rtexte", "fin"]);
  });
});
