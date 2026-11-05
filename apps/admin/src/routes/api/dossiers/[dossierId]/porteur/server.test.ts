import { beforeEach, expect, test, vi } from "vitest";
import { PUT } from "./+server.ts";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import {
  updatePorteurFromAdmin,
  DossierPorteurReadOnlyError,
} from "@pitchou/server/database/dossier_admin/porteur.ts";
import {
  DossierManagedByDnError,
  DossierNotFoundError,
} from "@pitchou/server/database/dossier_admin.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

const { transaction, actor } = vi.hoisted(() => ({ transaction: {}, actor: { id: 7 } }));
vi.mock("#lib/server/writeAccess.ts", () => ({ withAdminWriteAccess: vi.fn() }));
vi.mock("@pitchou/server/database/dossier_admin/porteur.ts", async (original) => ({
  ...(await original<typeof import("@pitchou/server/database/dossier_admin/porteur.ts")>()),
  updatePorteurFromAdmin: vi.fn(),
}));
vi.mock("@pitchou/server/database/dossier_admin_list.ts", () => ({
  getDossierDetailForAdmin: vi.fn(),
}));

const organisation = {
  type: "organisation",
  name: "Commune de Tours",
  address: null,
  siren: null,
  verification_status: "source_declared",
  source: "onagre",
  source_reference: "acteur-42",
  verification_evidence: null,
};
function event(body: unknown, id = "42") {
  return {
    params: { dossierId: id },
    locals: { user: actor },
    request: new Request("http://localhost/api/dossiers/42/porteur", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  } as unknown as Parameters<typeof PUT>[0];
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(withAdminWriteAccess).mockImplementation(async (_locals, _permission, write) =>
    write(transaction as never, actor as never),
  );
  vi.mocked(getDossierDetailForAdmin).mockResolvedValue({ id: 42 } as never);
});

test.each([
  organisation,
  {
    ...organisation,
    verification_status: "verified",
    siren: "123456789",
    verification_evidence: "Registry",
  },
  { type: "personne_morale", siret: "12345678900001" },
])("updates only the porteur under the locked admin permission guard: %j", async (porteur) => {
  const input = event({ porteur_de_projet: porteur });
  const response = await PUT(input);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: 42 });
  expect(withAdminWriteAccess).toHaveBeenCalledExactlyOnceWith(
    input.locals,
    "admin:dossiers:update",
    expect.any(Function),
  );
  expect(updatePorteurFromAdmin).toHaveBeenCalledExactlyOnceWith(42, porteur, 7, transaction);
  expect(getDossierDetailForAdmin).toHaveBeenCalledExactlyOnceWith(42);
});

test.each([
  null,
  [],
  {},
  { porteur_de_projet: null },
  { porteur_de_projet: { type: "personne_physique", last_name: "Martin" } },
  { porteur_de_projet: { type: "personne_morale", siret: "123" } },
  { porteur_de_projet: { type: "personne_morale", siret: 12345678900001 } },
  {
    porteur_de_projet: { type: "personne_morale", siret: "12345678900001", legal_name: "New name" },
  },
  { porteur_de_projet: organisation, relations: {} },
  { porteur_de_projet: organisation, "": "Unexpected field" },
  { porteur_de_projet: { ...organisation, "": "Unexpected field" } },
  {
    porteur_de_projet: { type: "personne_morale", siret: "12345678900001", "": "Unexpected field" },
  },
  { porteur_de_projet: { ...organisation, id: 1 } },
  { porteur_de_projet: { ...organisation, name: " " } },
  { porteur_de_projet: { ...organisation, siren: "123456789" } },
  { porteur_de_projet: { ...organisation, verification_status: "verified" } },
])("rejects invalid or broader payloads before opening the transaction: %j", async (body) => {
  await expect(PUT(event(body))).rejects.toMatchObject({ status: 400 });
  expect(withAdminWriteAccess).not.toHaveBeenCalled();
  expect(updatePorteurFromAdmin).not.toHaveBeenCalled();
});

test.each(["invalid", "1.5", "0", "-1"])("rejects invalid dossier id %s", async (id) => {
  await expect(PUT(event({ porteur_de_projet: organisation }, id))).rejects.toMatchObject({
    status: 400,
  });
  expect(withAdminWriteAccess).not.toHaveBeenCalled();
});

test.each([
  [new DossierNotFoundError(42), 404],
  [new DossierManagedByDnError(42), 409],
  [new DossierPorteurReadOnlyError(42 as DossierId), 409],
])("maps rejected dossier writes to HTTP errors", async (caught, status) => {
  vi.mocked(updatePorteurFromAdmin).mockRejectedValue(caught);
  await expect(PUT(event({ porteur_de_projet: organisation }))).rejects.toMatchObject({ status });
  expect(getDossierDetailForAdmin).not.toHaveBeenCalled();
});

test("a permission rejection after parsing prevents the update and response reload", async () => {
  vi.mocked(withAdminWriteAccess).mockRejectedValue({ status: 403 });
  await expect(PUT(event({ porteur_de_projet: organisation }))).rejects.toMatchObject({
    status: 403,
  });
  expect(updatePorteurFromAdmin).not.toHaveBeenCalled();
  expect(getDossierDetailForAdmin).not.toHaveBeenCalled();
});
