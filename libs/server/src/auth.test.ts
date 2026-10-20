import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
const dossierId = 1 as DossierId;
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock(import("./database/dossier.ts"), () => ({
  dossiersAccessibleViaCap: vi.fn(),
}));

import { checkDossierAccessByCap } from "./auth.ts";
import { dossiersAccessibleViaCap } from "./database/dossier.ts";

const mockedDossiersAccessibleViaCap = vi.mocked(dossiersAccessibleViaCap);

function makeReply() {
  const reply = {
    statusCode: 0 as number,
    body: undefined as unknown,
    code(this: any, c: number) {
      this.statusCode = c;
      return this;
    },
    send(this: any, body: unknown) {
      this.body = body;
      return this;
    },
  };
  return reply;
}

beforeEach(() => {
  mockedDossiersAccessibleViaCap.mockReset();
});

describe("checkDossierAccessByCap", () => {
  it("replies 400 when cap is missing", async () => {
    const reply = makeReply();
    const result = await checkDossierAccessByCap(dossierId, undefined, reply);
    expect(reply.statusCode).toBe(400);
    expect(result).toBeUndefined();
    expect(mockedDossiersAccessibleViaCap).not.toHaveBeenCalled();
  });

  it("replies 403 when dossierId is missing", async () => {
    const reply = makeReply();
    const result = await checkDossierAccessByCap(undefined, "some-cap", reply);
    expect(reply.statusCode).toBe(403);
    expect(result).toBeUndefined();
    expect(mockedDossiersAccessibleViaCap).not.toHaveBeenCalled();
  });

  it("replies 403 when the cap does not grant access to the dossier", async () => {
    mockedDossiersAccessibleViaCap.mockResolvedValue(new Map());
    const reply = makeReply();
    const result = await checkDossierAccessByCap(dossierId, "some-cap", reply);
    expect(reply.statusCode).toBe(403);
    expect(result).toBeUndefined();
  });

  it("replies 403 when the dossier is only shared in read-only mode", async () => {
    mockedDossiersAccessibleViaCap.mockResolvedValue(new Map([[dossierId, "lecture"]]));
    const reply = makeReply();
    const result = await checkDossierAccessByCap(dossierId, "some-cap", reply);
    expect(reply.statusCode).toBe(403);
    expect(result).toBeUndefined();
  });

  it("returns the dossierId when the cap grants full access", async () => {
    mockedDossiersAccessibleViaCap.mockResolvedValue(new Map([[dossierId, "complet"]]));
    const reply = makeReply();
    const result = await checkDossierAccessByCap(dossierId, "some-cap", reply);
    expect(result).toBe(1);
    expect(reply.statusCode).toBe(0);
  });
});
