import { describe, it, expect, vi } from "vitest";
import { subtle } from "node:crypto";

const TEST_KEY = vi.hoisted(() => {
  const value = "0123456789abcdef0123456789abcdef";
  process.env.KEY_CHIFFREMENT_DONNEES_INSTRUCTIONS_DOSSIER = value;
  return value;
});

import {
  encryptDossiersAdditionalData,
  decryptDossiersAdditionalData,
} from "./chiffrerDechiffrerDonneesSupplementaires.ts";

describe("encrypt then decrypt", () => {
  it("recovers a plain ASCII string", async () => {
    const plain = "hello world";
    const cipher = await encryptDossiersAdditionalData(plain);
    expect(await decryptDossiersAdditionalData(cipher)).toBe(plain);
  });

  it("recovers a string with French accented characters", async () => {
    const plain = "Données supplémentaires : éàùç";
    const cipher = await encryptDossiersAdditionalData(plain);
    expect(await decryptDossiersAdditionalData(cipher)).toBe(plain);
  });

  it("recovers the empty string", async () => {
    const cipher = await encryptDossiersAdditionalData("");
    expect(await decryptDossiersAdditionalData(cipher)).toBe("");
  });

  it("recovers a long string (10k characters)", async () => {
    const plain = "a".repeat(10_000);
    const cipher = await encryptDossiersAdditionalData(plain);
    expect(await decryptDossiersAdditionalData(cipher)).toBe(plain);
  });

  it("recovers a JSON payload", async () => {
    const plain = JSON.stringify({ dossier: 42, espèces: ["loup", "ours"] });
    const cipher = await encryptDossiersAdditionalData(plain);
    expect(await decryptDossiersAdditionalData(cipher)).toBe(plain);
  });
});

describe("chiffrerDonnéesSupplémentairesDossiers", () => {
  it("returns a base64 string (chosen to fit in a DS text field)", async () => {
    const cipher = await encryptDossiersAdditionalData("hello");
    expect(cipher).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("produces a different ciphertext on each call for the same plaintext (random IV)", async () => {
    const a = await encryptDossiersAdditionalData("hello");
    const b = await encryptDossiersAdditionalData("hello");
    expect(a).not.toBe(b);
  });

  it("produces different ciphertexts for different plaintexts", async () => {
    const a = await encryptDossiersAdditionalData("hello");
    const b = await encryptDossiersAdditionalData("world");
    expect(a).not.toBe(b);
  });
});

describe("déchiffrerDonnéesSupplémentairesDossiers", () => {
  it("rejects ciphertext that is not valid base64-decoded GCM data", async () => {
    await expect(decryptDossiersAdditionalData("not-real-ciphertext")).rejects.toThrow();
  });

  // AES-GCM authenticates its ciphertext; flipping a byte must make decryption fail rather than silently returning garbage
  it("rejects tampered ciphertext", async () => {
    const cipher = await encryptDossiersAdditionalData("hello");
    const bytes = Buffer.from(cipher, "base64");
    bytes[0] ^= 0x01;
    const tampered = bytes.toString("base64");
    await expect(decryptDossiersAdditionalData(tampered)).rejects.toThrow();
  });
});

describe("backward compatibility with the legacy fixed-IV format", () => {
  // Reproduces the pre-migration encryption: no IV prefix in the output,
  // ciphertext encrypted under a fixed 12-byte IV ("000000000000")
  async function encryptWithLegacyFixedIv(plaintext: string): Promise<string> {
    const legacyKey = await subtle.importKey(
      "raw",
      Buffer.from(TEST_KEY.slice(0, 32)),
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );
    const cipher = await subtle.encrypt(
      { name: "AES-GCM", iv: Buffer.from("000000000000") },
      legacyKey,
      Buffer.from(plaintext, "utf-8"),
    );
    return Buffer.from(cipher).toString("base64");
  }

  it("decrypts data encrypted with the legacy fixed-IV format", async () => {
    const legacyCipher = await encryptWithLegacyFixedIv("hello");
    expect(await decryptDossiersAdditionalData(legacyCipher)).toBe("hello");
  });

  it("decrypts legacy data containing French accented characters", async () => {
    const plain = "Données supplémentaires : éàùç";
    const legacyCipher = await encryptWithLegacyFixedIv(plain);
    expect(await decryptDossiersAdditionalData(legacyCipher)).toBe(plain);
  });
});
