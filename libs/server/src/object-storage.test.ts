import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Capture command instantiations and the client `.send` calls.
const sendMock = vi.fn();
const putCtor = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  class PutObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
      putCtor(input);
    }
  }
  class GetObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class DeleteObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class S3Client {
    send = sendMock;
    constructor(_options: unknown) {}
  }
  return { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client };
});

const TEST_BUCKET = "test-bucket";

beforeEach(() => {
  process.env.S3_BUCKET = TEST_BUCKET;
  sendMock.mockReset();
  putCtor.mockReset();
  vi.resetModules();
});

afterEach(() => {
  delete process.env.S3_BUCKET;
});

describe("putObject", () => {
  it('defaults the content-type to "application/octet-stream" when missing', async () => {
    sendMock.mockResolvedValue({});
    const { putObject } = await import("./object-storage.ts");
    await putObject("files/a", Buffer.from(""));
    expect(putCtor.mock.calls[0][0].ContentType).toBe("application/octet-stream");
  });
});

describe("getObject", () => {
  it("throws when the response has no body", async () => {
    sendMock.mockResolvedValue({ Body: undefined });
    const { getObject } = await import("./object-storage.ts");
    await expect(getObject("files/missing")).rejects.toThrow(/no body/i);
  });
});

describe("getBucket", () => {
  it("throws when S3_BUCKET is not set", async () => {
    delete process.env.S3_BUCKET;
    const { getBucket } = await import("./object-storage.ts");
    expect(() => getBucket()).toThrow(/S3_BUCKET/);
  });
});
