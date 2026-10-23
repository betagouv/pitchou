import { expect, test, vi } from "vitest";
import { saveUser } from "@pitchou/server/administration/users.ts";
import { db } from "../setup/db.ts";
import { admin } from "../helpers/administration.ts";
import { sessionUserId } from "../helpers/auth.ts";
import { createInstructeurWithDossier, type InstructeurWithDossier } from "../factories/index.ts";
import { POST } from "../../src/routes/dossier/[dossierId]/+server.ts";

function post(instructeur: InstructeurWithDossier, request: Request) {
  return Promise.resolve(
    POST({
      locals: { user: { id: sessionUserId(instructeur.cap) } },
      params: { dossierId: String(instructeur.dossier.id) },
      request,
    } as Parameters<typeof POST>[0]),
  ).then(
    (response) => response.status,
    (error: unknown) => {
      if (error && typeof error === "object" && "status" in error) return error.status;
      throw error;
    },
  );
}

function request(body: BodyInit = JSON.stringify({ enjeu: true })) {
  return new Request("http://localhost/dossier/1", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit);
}

async function expectWaiter(pid: number, query: string) {
  await expect
    .poll(
      async () => {
        const { rows } = await db.raw(
          "select pid from pg_stat_activity where datname = current_database() and ? = any(pg_blocking_pids(pid)) and query like ?",
          [pid, query],
        );
        return rows.length;
      },
      { timeout: 5000 },
    )
    .toBe(1);
}

test.each(["deactivation", "permission revocation"])(
  "a delayed dossier body cannot write after %s commits",
  async (reason) => {
    const instructeur = await createInstructeurWithDossier(db);
    const actor = await admin();
    const reading = Promise.withResolvers<void>();
    let stream!: ReadableStreamDefaultController<Uint8Array>;
    const pendingRequest = request(
      new ReadableStream({
        start(controller) {
          stream = controller;
        },
      }),
    );
    const readBody = pendingRequest.json.bind(pendingRequest);
    vi.spyOn(pendingRequest, "json").mockImplementation(() => {
      reading.resolve();
      return readBody();
    });
    const response = post(instructeur, pendingRequest);
    try {
      await reading.promise;
      await saveUser(actor.id, {
        id: instructeur.id,
        email: instructeur.email,
        active: reason !== "deactivation",
        bundles: reason === "deactivation" ? ["instructeur"] : [],
        grants: [],
        exclusions: [],
      });
    } finally {
      stream.enqueue(new TextEncoder().encode('{"enjeu":true}'));
      stream.close();
    }
    expect(await response).toBe(403);
    expect(await db("dossier").where({ id: instructeur.dossier.id }).first()).not.toMatchObject({
      enjeu: true,
    });
    expect(await db("action_dossier").where({ dossier: instructeur.dossier.id })).toEqual([]);
  },
);

test("a dossier write waiting behind revocation checks the committed permissions", async () => {
  const instructeur = await createInstructeurWithDossier(db);
  const revocation = await db.transaction();
  let response: ReturnType<typeof post> | undefined;
  try {
    const {
      rows: [{ pid }],
    } = await revocation.raw("select pg_backend_pid() as pid");
    // The dossier row forces the old handler to queue after its obsolete access check.
    await revocation("dossier").where({ id: instructeur.dossier.id }).forUpdate().first();
    await revocation("auth_permission_bundle").where({ user_id: instructeur.id }).delete();
    response = post(instructeur, request());
    await expectWaiter(pid, "%");
    await revocation.commit();
    expect(await response).toBe(403);
    expect(await db("dossier").where({ id: instructeur.dossier.id }).first()).not.toMatchObject({
      enjeu: true,
    });
    expect(await db("action_dossier").where({ dossier: instructeur.dossier.id })).toEqual([]);
  } finally {
    if (!revocation.isCompleted()) await revocation.rollback();
    await response;
  }
});

test("a write takes the access lock before a dossier row lock, so revocation waits for its commit", async () => {
  const instructeur = await createInstructeurWithDossier(db);
  const actor = await admin();
  const rowLock = await db.transaction();
  let response: ReturnType<typeof post> | undefined;
  let revocation: ReturnType<typeof saveUser> | undefined;
  try {
    const {
      rows: [{ pid }],
    } = await rowLock.raw("select pg_backend_pid() as pid");
    await rowLock("dossier").where({ id: instructeur.dossier.id }).forUpdate().first();
    response = post(instructeur, request());
    await expectWaiter(pid, '%from "dossier"%for update%');
    const {
      rows: [{ pid: writerPid }],
    } = await db.raw("select pid from pg_stat_activity where ? = any(pg_blocking_pids(pid))", [
      pid,
    ]);
    revocation = saveUser(actor.id, {
      id: instructeur.id,
      email: instructeur.email,
      active: true,
      bundles: [],
      grants: [],
      exclusions: [],
    });
    await expectWaiter(writerPid, "%pg_advisory_xact_lock%");
    await rowLock.commit();
    expect(await response).toBe(200);
    await revocation;
    expect(await db("dossier").where({ id: instructeur.dossier.id }).first()).toMatchObject({
      enjeu: true,
    });
    expect(await post(instructeur, request())).toBe(403);
  } finally {
    if (!rowLock.isCompleted()) await rowLock.rollback();
    await response;
    await revocation;
  }
});
