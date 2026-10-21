import { afterEach, expect, test, vi } from "vitest";
import { sendFilesToStorage } from "./storageUpload.ts";
import type { UploadUrl } from "@pitchou/types/API_Pitchou.ts";

afterEach(() => vi.unstubAllGlobals());

test("uploads sequentially and reports progress relative to previously completed files", async () => {
  const requests: FakeRequest[] = [];
  class FakeRequest {
    status = 200;
    listeners = new Map<string, () => void>();
    progress: (event: { lengthComputable: boolean; loaded: number }) => void = () => {};
    upload = {
      addEventListener: (_name: string, listener: typeof this.progress) => {
        this.progress = listener;
      },
    };
    open = vi.fn();
    send = vi.fn();
    addEventListener(name: string, listener: () => void) {
      this.listeners.set(name, listener);
    }
    constructor() {
      requests.push(this);
    }
  }
  vi.stubGlobal("XMLHttpRequest", FakeRequest);
  const files = [new File(["abcd"], "first.txt"), new File(["ef"], "second.txt")];
  const urls = [
    { id: "first" as UploadUrl["id"], url: "https://storage.test/first" },
    { id: "second" as UploadUrl["id"], url: "https://storage.test/second" },
  ];
  const progress = vi.fn();
  const result = sendFilesToStorage(files, urls, progress);
  expect(requests).toHaveLength(1);
  expect(requests[0].send).toHaveBeenCalledWith(files[0]);
  requests[0].progress({ lengthComputable: true, loaded: 2 });
  expect(progress).toHaveBeenLastCalledWith(2 / 6);
  requests[0].listeners.get("load")!();
  await vi.waitFor(() => expect(requests).toHaveLength(2));
  expect(requests[1].open).toHaveBeenCalledWith("PUT", urls[1].url);
  expect(requests[1].send).toHaveBeenCalledWith(files[1]);
  requests[1].progress({ lengthComputable: true, loaded: 1 });
  expect(progress).toHaveBeenLastCalledWith(5 / 6);
  requests[1].listeners.get("load")!();
  await expect(result).resolves.toEqual([
    { id: "first", name: "first.txt" },
    { id: "second", name: "second.txt" },
  ]);
  expect(progress).toHaveBeenLastCalledWith(1);
});
