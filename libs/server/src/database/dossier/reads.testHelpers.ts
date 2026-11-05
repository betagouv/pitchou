import type { Knex } from "knex";
import { vi } from "vitest";

export function fakeConnection(queries: { run<T>(name: string, value: T): Promise<T> }) {
  const row = {
    id: 42,
    main_activite: null,
    ddep_depot_date: null,
    depot_date: new Date("2026-01-01"),
    especesImpacteesCD_REF: [],
  };
  const builder = {
    select: vi.fn().mockReturnThis(),
    count: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    as: vi.fn().mockReturnThis(),
    withMaterialized: vi.fn().mockReturnThis(),
    whereIn: vi.fn().mockReturnThis(),
    distinctOn: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    first: () => queries.run("dossier", { ...row }),
    // Knex query builders start executing when awaited.
    // oxlint-disable-next-line unicorn/no-thenable
    then: (resolve: (rows: object[]) => unknown) =>
      queries.run("dossiers", [{ ...row }]).then(resolve),
  };
  const trx = Object.assign(
    vi.fn(() => builder),
    {
      isTransaction: true,
      raw: vi.fn(),
      commit: vi.fn(async () => {}),
      rollback: vi.fn(async () => {}),
      transaction: vi.fn(),
    },
  );
  const connection = { transaction: vi.fn(async () => trx) };
  return {
    trx,
    transaction: trx as unknown as Knex.Transaction,
    connection,
    knex: connection as unknown as Knex,
  };
}
