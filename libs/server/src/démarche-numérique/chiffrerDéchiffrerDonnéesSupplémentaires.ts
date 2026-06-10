import { subtle, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";

const ALGORITHM_NAME = "AES-GCM";
const IV_LENGTH = 12;
// 12 bytes of ASCII '0' (0x30): the IV used by the legacy fixed-IV format
// Kept so ciphertexts written before the random-IV migration still decrypt
const LEGACY_IV = Buffer.from("000000000000");
const ENCODING = "utf-8";

let keyPromise: Promise<CryptoKey> | undefined;
function getKey() {
  if (!keyPromise) {
    const keyData = process.env.KEY_CHIFFREMENT_DONNEES_INSTRUCTIONS_DOSSIER;
    if (!keyData) {
      throw new Error(
        `Variable d'environnement KEY_CHIFFREMENT_DONNEES_INSTRUCTIONS_DOSSIER manquante`,
      );
    }
    keyPromise = subtle.importKey(
      "raw",
      Buffer.from(keyData.slice(0, 32)),
      { name: ALGORITHM_NAME },
      false,
      ["decrypt", "encrypt"],
    );
  }
  return keyPromise;
}

export async function chiffrerDonnéesSupplémentairesDossiers(
  donnéesSupplémentaires: string,
): Promise<string> {
  const iv = randomBytes(IV_LENGTH);
  const donnéesChiffrées = await subtle.encrypt(
    { name: ALGORITHM_NAME, iv },
    await getKey(),
    Buffer.from(donnéesSupplémentaires, ENCODING),
  );

  const ciphertextAndTag = Buffer.from(donnéesChiffrées);
  // Prepend the IV so decrypt can recover it: [IV (12 bytes) || ciphertext || tag (16 bytes)]
  const output = Buffer.concat([iv, ciphertextAndTag]);
  // Base64 keeps the payload within the charset DS text fields accept
  return output.toString("base64");
}

export async function déchiffrerDonnéesSupplémentairesDossiers(
  donnéesSupplémentairesChiffrées: string,
): Promise<string> {
  const raw = Buffer.from(donnéesSupplémentairesChiffrées, "base64");

  const key = await getKey();
  try {
    // Mirror of the encrypt format: first 12 bytes are the IV, the rest is ciphertext+tag
    const iv = raw.subarray(0, IV_LENGTH);
    const ciphertextAndTag = raw.subarray(IV_LENGTH);
    const plaintext = await subtle.decrypt({ name: ALGORITHM_NAME, iv }, key, ciphertextAndTag);
    return Buffer.from(plaintext).toString(ENCODING);
  } catch {
    // Fallback for ciphertexts written before the random-IV migration: no IV prefix, decrypt under the legacy fixed IV
    const plaintext = await subtle.decrypt({ name: ALGORITHM_NAME, iv: LEGACY_IV }, key, raw);
    return Buffer.from(plaintext).toString(ENCODING);
  }
}
