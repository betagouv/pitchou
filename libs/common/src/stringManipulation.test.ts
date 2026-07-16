import { describe, it, expect } from "vitest";

import {
  UTF8ToB64,
  normalizeEmail,
  normalizeEspeceName,
  normalizeEspeceText,
  removeAccents,
} from "./stringManipulation.ts";

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

describe("normalizeEmail", () => {
  it("lowercases the address", () => {
    expect(normalizeEmail("Foo.Bar@Example.COM")).toBe("foo.bar@example.com");
  });

  it("leaves an already-lowercase address unchanged", () => {
    expect(normalizeEmail("foo@bar.fr")).toBe("foo@bar.fr");
  });
});

describe("normalizeEspeceName", () => {
  it("strips diacritics", () => {
    expect(normalizeEspeceName("Éléphant")).toBe("elephant");
  });

  it("lowercases", () => {
    expect(normalizeEspeceName("LOUP")).toBe("loup");
  });

  it('removes the French article "(le)"', () => {
    expect(normalizeEspeceName("Loup gris (le)")).toBe("loup gris");
  });

  it('removes the French article "(la)"', () => {
    expect(normalizeEspeceName("Belette (la)")).toBe("belette");
  });

  it(`removes the French article "(l')"`, () => {
    expect(normalizeEspeceName(`Ours brun (l')`)).toBe("ours brun");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeEspeceName("  Loup  ")).toBe("loup");
  });

  it("does NOT remove articles written with a curly apostrophe", () => {
    // Only the straight-apostrophe form is matched; this pins down the current behavior.
    expect(normalizeEspeceName(`Ours brun (l’)`)).toBe("ours brun (l’)");
  });
});

describe("normalizeEspeceText", () => {
  it("strips diacritics and lowercases", () => {
    expect(normalizeEspeceText("Éléphant")).toBe("elephant");
  });

  it(`rewrites curly apostrophes ’ to straight apostrophes '`, () => {
    expect(normalizeEspeceText("l’ours")).toBe(`l'ours`);
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeEspeceText("  Loup  ")).toBe("loup");
  });

  it(`does NOT strip "(le)/(la)/(l')" — that is normalizeEspeceName's job`, () => {
    expect(normalizeEspeceText("Loup gris (le)")).toBe("loup gris (le)");
  });
});

describe("removeAccents", () => {
  it("strips combining marks", () => {
    expect(removeAccents("Éléphant")).toBe("Elephant");
  });

  it("preserves case", () => {
    expect(removeAccents("ÉÊÈ")).toBe("EEE");
  });

  it("does not trim surrounding whitespace", () => {
    expect(removeAccents("  café  ")).toBe("  cafe  ");
  });
});
