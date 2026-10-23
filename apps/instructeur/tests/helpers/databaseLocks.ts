import { expect } from "vitest";
import { db } from "../setup/db.ts";

export async function expectDatabaseWaiter(blocker: number, query: string) {
  let waiter: number | undefined;
  await expect
    .poll(
      async () => {
        const { rows } = await db.raw(
          "select pid from pg_stat_activity where datname = current_database() and ? = any(pg_blocking_pids(pid)) and query like ?",
          [blocker, query],
        );
        waiter = rows[0]?.pid;
        return rows.length;
      },
      { timeout: 5000 },
    )
    .toBe(1);
  return waiter!;
}
