import { expect, test, vi } from "vitest";
import { saveUser } from "@pitchou/server/administration/users.ts";
import { getSessionUser } from "@pitchou/server/users.ts";
import { db } from "../setup/db.ts";
import { admin } from "../helpers/administration.ts";
import { POST } from "../../../admin/src/routes/api/activites/+server.ts";

test.each(["deactivation", "permission revocation"])(
  "an admin activity POST with a delayed body rejects after %s commits",
  async (reason) => {
    const operator = await admin();
    const [target] = await db("auth_user")
      .insert({ email: "target@race.test", active: true })
      .returning("*");
    await db("auth_permission_bundle").insert({ user_id: target.id, bundle: "administrateur" });
    const user = await getSessionUser(target.id);
    const groupe = await db("activite_groupe").first();
    const reading = Promise.withResolvers<void>();
    let stream!: ReadableStreamDefaultController<Uint8Array>;
    const request = new Request("http://localhost/api/activites", {
      method: "POST",
      duplex: "half",
      body: new ReadableStream({
        start(controller) {
          stream = controller;
        },
      }),
    } as RequestInit);
    const readBody = request.json.bind(request);
    vi.spyOn(request, "json").mockImplementation(() => {
      reading.resolve();
      return readBody();
    });
    const response = Promise.resolve(
      POST({ request, locals: { user } } as Parameters<typeof POST>[0]),
    ).then(
      (result) => result.status,
      (error: unknown) => {
        if (error && typeof error === "object" && "status" in error) return error.status;
        throw error;
      },
    );
    try {
      await reading.promise;
      await saveUser(operator.id, {
        id: target.id,
        email: target.email,
        active: reason !== "deactivation",
        bundles: reason === "deactivation" ? ["administrateur"] : [],
        grants: [],
        exclusions: [],
      });
    } finally {
      stream.enqueue(
        new TextEncoder().encode(
          JSON.stringify({
            label: "Revoked admin activity",
            groupeCode: groupe.code,
          }),
        ),
      );
      stream.close();
    }
    expect(await response).toBe(403);
    expect(await db("activite").where({ code: "revoked-admin-activity" })).toEqual([]);
  },
);
