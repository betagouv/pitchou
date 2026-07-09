import { afterEach, expect, test } from "vitest";

import { store } from "$lib/state/store.svelte.ts";
import { maxUploadSizeMo, uploadSizeHint } from "./uploadSizeHint.ts";

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
