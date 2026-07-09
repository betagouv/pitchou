import { afterEach, expect, test } from "vitest";

import { store } from "$lib/state/store.svelte.ts";
import { maxUploadSizeMo, uploadSizeHint, uploadSizeError } from "./uploadSizeHint.ts";

function fauxFichier(octets: number): File {
  return { size: octets } as File;
}

afterEach(() => {
  store.maxUploadSizeBytes = undefined;
});

test("maxUploadSizeMo renvoie null quand la limite est inconnue", () => {
  store.maxUploadSizeBytes = undefined;
  expect(maxUploadSizeMo()).toBe(null);
});

test("maxUploadSizeMo renvoie null quand la limite est illimitée", () => {
  store.maxUploadSizeBytes = Infinity;
  expect(maxUploadSizeMo()).toBe(null);
});

test("maxUploadSizeMo convertit les octets en Mo", () => {
  store.maxUploadSizeBytes = 200 * 1024 * 1024;
  expect(maxUploadSizeMo()).toBe(200);
});

test("uploadSizeHint affiche la taille maximale en Mo", () => {
  store.maxUploadSizeBytes = 200 * 1024 * 1024;
  expect(uploadSizeHint()).toBe("Taille maximale\u00A0: 200 Mo.");
});

test("uploadSizeHint est vide quand la limite est inconnue", () => {
  store.maxUploadSizeBytes = undefined;
  expect(uploadSizeHint()).toBe("");
});

test("uploadSizeError renvoie null quand la limite est inconnue", () => {
  store.maxUploadSizeBytes = undefined;
  expect(uploadSizeError([fauxFichier(999 * 1024 * 1024)])).toBe(null);
});

test("uploadSizeError renvoie null quand le fichier tient dans la limite", () => {
  store.maxUploadSizeBytes = 70 * 1024 * 1024;
  expect(uploadSizeError([fauxFichier(10 * 1024 * 1024)])).toBe(null);
});

test("uploadSizeError signale un fichier trop volumineux", () => {
  store.maxUploadSizeBytes = 70 * 1024 * 1024;
  expect(uploadSizeError([fauxFichier(80 * 1024 * 1024)])).toBe(
    "Fichier trop volumineux. Taille maximale\u00A0: 70 Mo.",
  );
});

test("uploadSizeError signale si un seul fichier de la liste dépasse la limite", () => {
  store.maxUploadSizeBytes = 70 * 1024 * 1024;
  const fichiers = [fauxFichier(10 * 1024 * 1024), fauxFichier(80 * 1024 * 1024)];
  expect(uploadSizeError(fichiers)).toBe("Fichier trop volumineux. Taille maximale\u00A0: 70 Mo.");
});
