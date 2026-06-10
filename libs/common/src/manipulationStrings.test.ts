import { describe, it, expect } from "vitest";

import {
  UTF8ToB64,
  normalisationEmail,
  normalizeNomEspèce,
  normalizeTexteEspèce,
  retirerAccents,
} from "./manipulationStrings.ts";

describe("UTF8ToB64", () => {
  it("encodes plain ASCII", () => {
    expect(UTF8ToB64("hello")).toBe("aGVsbG8=");
  });

  it("encodes a multibyte UTF-8 character as its UTF-8 byte sequence", () => {
    // 'é' (U+00E9) → UTF-8 bytes 0xC3 0xA9 → base64 'w6k='
    expect(UTF8ToB64("é")).toBe("w6k=");
  });

  it("encodes the empty string to the empty string", () => {
    expect(UTF8ToB64("")).toBe("");
  });
});

describe("normalisationEmail", () => {
  it("lowercases the address", () => {
    expect(normalisationEmail("Foo.Bar@Example.COM")).toBe("foo.bar@example.com");
  });

  it("leaves an already-lowercase address unchanged", () => {
    expect(normalisationEmail("foo@bar.fr")).toBe("foo@bar.fr");
  });
});

describe("normalizeNomEspèce", () => {
  it("strips diacritics", () => {
    expect(normalizeNomEspèce("Éléphant")).toBe("elephant");
  });

  it("lowercases", () => {
    expect(normalizeNomEspèce("LOUP")).toBe("loup");
  });

  it('removes the French article "(le)"', () => {
    expect(normalizeNomEspèce("Loup gris (le)")).toBe("loup gris");
  });

  it('removes the French article "(la)"', () => {
    expect(normalizeNomEspèce("Belette (la)")).toBe("belette");
  });

  it(`removes the French article "(l')"`, () => {
    expect(normalizeNomEspèce(`Ours brun (l')`)).toBe("ours brun");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeNomEspèce("  Loup  ")).toBe("loup");
  });

  it("does NOT remove articles written with a curly apostrophe", () => {
    // Only the straight-apostrophe form is matched; this pins down the current behavior.
    expect(normalizeNomEspèce(`Ours brun (l’)`)).toBe("ours brun (l’)");
  });
});

describe("normalizeTexteEspèce", () => {
  it("strips diacritics and lowercases", () => {
    expect(normalizeTexteEspèce("Éléphant")).toBe("elephant");
  });

  it(`rewrites curly apostrophes ’ to straight apostrophes '`, () => {
    expect(normalizeTexteEspèce("l’ours")).toBe(`l'ours`);
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeTexteEspèce("  Loup  ")).toBe("loup");
  });

  it(`does NOT strip "(le)/(la)/(l')" — that is normalizeNomEspèce's job`, () => {
    expect(normalizeTexteEspèce("Loup gris (le)")).toBe("loup gris (le)");
  });
});

describe("retirerAccents", () => {
  it("strips combining marks", () => {
    expect(retirerAccents("Éléphant")).toBe("Elephant");
  });

  it("preserves case", () => {
    expect(retirerAccents("ÉÊÈ")).toBe("EEE");
  });

  it("does not trim surrounding whitespace", () => {
    expect(retirerAccents("  café  ")).toBe("  cafe  ");
  });
});
