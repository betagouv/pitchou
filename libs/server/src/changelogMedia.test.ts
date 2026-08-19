import { expect, test } from "vitest";

import {
  changelogMediaUrl,
  isOwnMediaUrl,
  isValidMediaFileName,
  referencedMediaFileNames,
} from "./changelogMedia.ts";

const FILE = "6f9619ff-8b86-4d01-b42d-00cf4fc964ff.png";

test("isValidMediaFileName accepts <uuid>.<extension> only", () => {
  expect(isValidMediaFileName(FILE)).toBe(true);
  expect(isValidMediaFileName("6f9619ff-8b86-4d01-b42d-00cf4fc964ff.webm")).toBe(true);
  expect(isValidMediaFileName("capture.png")).toBe(false);
  expect(isValidMediaFileName("../files/x")).toBe(false);
  expect(isValidMediaFileName("6f9619ff-8b86-4d01-b42d-00cf4fc964ff")).toBe(false);
  expect(isValidMediaFileName(`${FILE}/other`)).toBe(false);
});

test("isOwnMediaUrl only matches the entry's own serving URLs", () => {
  expect(isOwnMediaUrl(changelogMediaUrl(7, FILE), 7)).toBe(true);
  expect(isOwnMediaUrl(changelogMediaUrl(7, FILE), 8)).toBe(false);
  expect(isOwnMediaUrl(changelogMediaUrl(77, FILE), 7)).toBe(false);
  expect(isOwnMediaUrl(`https://evil.example${changelogMediaUrl(7, FILE)}`, 7)).toBe(false);
  expect(isOwnMediaUrl("/changelog-media/7/../8/x.png", 7)).toBe(false);
});

test("referencedMediaFileNames collects the entry's media from src attributes", () => {
  const other = "0e984725-c51c-4bf4-9960-e1c80e27aba0.mp4";
  const contenu =
    `<p>a</p><img src="${changelogMediaUrl(7, FILE)}" alt="capture" />` +
    `<video src="${changelogMediaUrl(7, other)}" controls></video>` +
    `<img src="${changelogMediaUrl(9, FILE)}" />` +
    '<img src="https://evil.example/pixel.png" />';
  expect(referencedMediaFileNames(7, contenu)).toEqual(new Set([FILE, other]));
  expect(referencedMediaFileNames(8, contenu)).toEqual(new Set());
});
