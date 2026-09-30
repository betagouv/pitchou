import { beforeEach, expect, test, vi } from "vitest";

import {
  changelogMediaUrl,
  isOwnMediaUrl,
  isValidMediaFileName,
  referencedMediaFileNames,
  registerChangelogMediaUpload,
} from "./changelogMedia.ts";
import { headPendingUpload } from "./database/fichier_upload.ts";
import { copyObject, deleteObject } from "./objectStorage.ts";

beforeEach(() => {
  vi.mocked(copyObject).mockReset().mockResolvedValue(undefined);
  vi.mocked(deleteObject).mockReset().mockResolvedValue(undefined);
});

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

vi.mock(import("./objectStorage.ts"), () => ({
  copyObject: vi.fn(),
  deleteObject: vi.fn(),
  getObject: vi.fn(),
  listObjectKeys: vi.fn(),
  pendingKey: (id: string) => `pending/${id}`,
}));
vi.mock(import("./database/fichier_upload.ts"), () => ({ headPendingUpload: vi.fn() }));

test("registerChangelogMediaUpload moves a pending upload under the entry's prefix", async () => {
  const upload = { id: "0f4b1e3c-7d2a-4c5e-9b1f-2a3c4d5e6f70" as never, name: "capture.png" };
  vi.mocked(headPendingUpload).mockResolvedValue({ contentLength: 3, contentType: "image/png" });

  const url = await registerChangelogMediaUpload(7, upload);

  const fileName = url.slice("/changelog-media/7/".length);
  expect(isValidMediaFileName(fileName)).toBe(true);
  expect(fileName.endsWith(".png")).toBe(true);
  expect(copyObject).toHaveBeenCalledWith(`pending/${upload.id}`, `changelog/7/${fileName}`);
  expect(deleteObject).toHaveBeenCalledWith(`pending/${upload.id}`);
});

test("registerChangelogMediaUpload refuses a type the changelog does not serve", async () => {
  const upload = { id: "0f4b1e3c-7d2a-4c5e-9b1f-2a3c4d5e6f70" as never, name: "doc.pdf" };
  vi.mocked(headPendingUpload).mockResolvedValue({
    contentLength: 3,
    contentType: "application/pdf",
  });

  await expect(registerChangelogMediaUpload(7, upload)).rejects.toMatchObject({ status: 400 });
  expect(copyObject).not.toHaveBeenCalled();
});
