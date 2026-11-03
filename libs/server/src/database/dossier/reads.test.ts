import type { Knex } from "knex";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeConnection } from "./reads.testHelpers.ts";

const queries = vi.hoisted(() => ({
  active: false,
  calls: [] as string[],
  failAt: "",
  denied: false,
  error: new Error("Query failed"),
  async run<T>(name: string, value: T): Promise<T> {
    if (this.active) throw new Error("Concurrent query on a transaction");
    this.calls.push(name);
    this.active = true;
    await Promise.resolve();
    this.active = false;
    if (this.failAt === name) throw this.error;
    return value;
  },
}));

vi.mock("../../database.ts", () => ({ directDatabaseConnection: {} }));
vi.mock("../connection.ts", () => ({ directDatabaseConnection: {} }));
vi.mock("./access.ts", () => ({
  dossiersAccessibleToUser: () => queries.run("access", new Map(queries.denied ? [] : [[42, {}]])),
  dossierAccessQuery: () => ({ as: () => ({}) }),
  getEvenementsPhaseDossier: () => queries.run("events", []),
  getLatestEvenementsPhaseDossiers: () => queries.run("events", []),
}));
vi.mock("./acteurs.ts", () => ({
  getDossierActeurs: () => queries.run("acteurs", new Map()),
}));
vi.mock("./fullQueries.ts", () => ({
  getAvisExpertDossier: () => queries.run("avis", []),
  getPiecesJointes: () => queries.run("pieces", []),
  getDecisionsDossier: () => queries.run("decisions", [{ id: "decision", dossier: 42 }]),
}));
vi.mock("../avis_expert.ts", () => ({
  getAvisExpertFilesForUser: () => queries.run("avis", []),
}));
vi.mock("../decision_administrative.ts", () => ({
  getDecisionsAdministratives: () => queries.run("decisions", []),
}));
vi.mock("../impact_espece/read.ts", () => ({
  getImpactOnEspeces: () => queries.run("impacts", []),
}));
vi.mock("../other_attachment.ts", () => ({
  getOtherAttachmentsForDossier: () => queries.run("attachments", []),
}));
vi.mock("../prescription.ts", () => ({
  getPrescriptions: vi.fn(() =>
    queries.run("prescriptions", [{ id: "prescription", decision_administrative: "decision" }]),
  ),
}));
vi.mock("../controle.ts", () => ({
  getControles: vi.fn(() => queries.run("controles", [])),
}));
vi.mock("../dossier_cnpn_email.ts", () => ({
  getDossierCnpnEmailSentEvents: () => queries.run("cnpn", []),
}));

import { getDossierFull } from "./full.ts";
import { getDossiersSummariesForUser } from "./summary.ts";
import { getPrescriptions } from "../prescription.ts";
import { getControles } from "../controle.ts";

const dossierId = 42 as DossierId;
const userId = 7 as UserId;

function deferred() {
  const { promise, resolve } = Promise.withResolvers<void>();
  return { promise, resolve };
}

beforeEach(() => {
  queries.active = false;
  queries.calls = [];
  queries.failAt = "";
  queries.denied = false;
  vi.clearAllMocks();
});

describe.each([
  {
    name: "full dossier",
    read: (connection: Knex | Knex.Transaction) => getDossierFull(dossierId, userId, connection),
    steps: [
      "access",
      "dossier",
      "acteurs",
      "events",
      "avis",
      "pieces",
      "decisions",
      "attachments",
      "impacts",
      "cnpn",
      "prescriptions",
      "controles",
    ],
  },
  {
    name: "dossier summaries",
    read: (connection: Knex | Knex.Transaction) => getDossiersSummariesForUser(userId, connection),
    steps: ["dossiers", "events", "decisions", "avis", "acteurs"],
  },
])("$name", ({ read, steps }) => {
  it("serializes queries and awaits its read-only transaction commit", async () => {
    const db = fakeConnection(queries);
    const commit = deferred();
    db.trx.commit.mockReturnValue(commit.promise);
    let settled = false;
    const result = read(db.knex).finally(() => {
      settled = true;
    });
    await vi.waitFor(() => expect(db.trx.commit).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    expect(queries.calls).toEqual(steps);
    expect(db.connection.transaction).toHaveBeenCalledWith({ readOnly: true });
    commit.resolve();
    await expect(result).resolves.toBeDefined();
    expect(db.trx.rollback).not.toHaveBeenCalled();
  });

  it.each(steps)("rolls back and propagates a failure in %s", async (step) => {
    const db = fakeConnection(queries);
    queries.failAt = step;
    await expect(read(db.knex)).rejects.toBe(queries.error);
    expect(queries.calls).toEqual(steps.slice(0, steps.indexOf(step) + 1));
    expect(db.trx.rollback).toHaveBeenCalledOnce();
    expect(db.trx.commit).not.toHaveBeenCalled();
  });

  it("awaits rollback before rejecting", async () => {
    const db = fakeConnection(queries);
    queries.failAt = steps[0]!;
    const rollback = deferred();
    db.trx.rollback.mockReturnValue(rollback.promise);
    let settled = false;
    const result = read(db.knex).catch((error) => {
      settled = true;
      return error;
    });
    await vi.waitFor(() => expect(db.trx.rollback).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    rollback.resolve();
    await expect(result).resolves.toBe(queries.error);
  });

  it("keeps a caller-owned transaction open after success", async () => {
    const db = fakeConnection(queries);
    await expect(read(db.transaction)).resolves.toBeDefined();
    expect(db.trx.transaction).not.toHaveBeenCalled();
    expect(db.trx.commit).not.toHaveBeenCalled();
    expect(db.trx.rollback).not.toHaveBeenCalled();
  });

  it("leaves rollback to the caller after failure", async () => {
    const db = fakeConnection(queries);
    queries.failAt = "events";
    await expect(read(db.transaction)).rejects.toBe(queries.error);
    expect(db.trx.transaction).not.toHaveBeenCalled();
    expect(db.trx.commit).not.toHaveBeenCalled();
    expect(db.trx.rollback).not.toHaveBeenCalled();
  });
});

it("loads prescriptions and controles using the preceding query results", async () => {
  const db = fakeConnection(queries);
  const dossier = await getDossierFull(dossierId, userId, db.knex);
  expect(getPrescriptions).toHaveBeenCalledWith(["decision"], db.transaction);
  expect(getControles).toHaveBeenCalledWith(["prescription"], db.transaction);
  expect(dossier?.decisionsAdministratives?.[0]?.prescriptions).toEqual([
    { id: "prescription", decision_administrative: "decision", controles: undefined },
  ]);
});

it.each([false, true])(
  "rejects inaccessible dossiers with caller ownership %s",
  async (callerOwned) => {
    const db = fakeConnection(queries);
    queries.denied = true;
    await expect(
      getDossierFull(dossierId, userId, callerOwned ? db.transaction : db.knex),
    ).rejects.toThrow("Le dossier 42 n'est pas accessible via la userId 7");
    expect(queries.calls).toEqual(["access"]);
    expect(db.trx.commit).not.toHaveBeenCalled();
    expect(db.trx.rollback).toHaveBeenCalledTimes(callerOwned ? 0 : 1);
  },
);
