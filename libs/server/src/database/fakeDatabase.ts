import { vi } from "vitest";
import type { Knex } from "knex";

type AnyValues = Record<string, unknown>;
type InsertArgs = [values: AnyValues | AnyValues[], returning?: string | string[]];

class FakeDatabaseBuilder {
  private insertImpl: (...args: InsertArgs) => Promise<unknown> = () => Promise.resolve([1]);
  private updateImpl: (values: AnyValues) => Promise<unknown> = () => Promise.resolve(1);
  private selectRowsByTable: Map<string, unknown[]> = new Map();
  private defaultSelectRows: unknown[] = [];
  private deleteImpl: () => Promise<unknown> = () => Promise.resolve(1);

  insertResolves(value: unknown): this {
    this.insertImpl = () => Promise.resolve(value);
    return this;
  }

  insertRejects(error: Error): this {
    this.insertImpl = () => Promise.reject(error);
    return this;
  }

  updateResolves(rowsAffected: number): this {
    this.updateImpl = () => Promise.resolve(rowsAffected);
    return this;
  }

  updateRejects(error: Error): this {
    this.updateImpl = () => Promise.reject(error);
    return this;
  }

  /** Rows returned by SELECT, regardless of which table is queried. */
  selectResolves(rows: unknown[]): this {
    this.defaultSelectRows = rows;
    return this;
  }

  /**
   * Rows returned by SELECT for a specific table. Use this when the code under
   * test queries several tables in sequence and each one needs its own response
   */
  selectResolvesForTable(tableName: string, rows: unknown[]): this {
    this.selectRowsByTable.set(tableName, rows);
    return this;
  }

  deleteResolves(rowsAffected: number): this {
    this.deleteImpl = () => Promise.resolve(rowsAffected);
    return this;
  }

  build() {
    const insertImpl = this.insertImpl;
    const updateImpl = this.updateImpl;
    const deleteImpl = this.deleteImpl;
    const defaultRows = this.defaultSelectRows;
    const rowsByTable = this.selectRowsByTable;
    // SELECT response depends on the most recent table(...) call, so we track it here.
    let lastTable = "";

    const rowsForLastTable = () => rowsByTable.get(lastTable) ?? defaultRows;

    // Thenable that resolves to the SELECT rows for the current table, and
    // supports `.first()`, `.update()`, `.delete()` continuations.
    const buildWhereResult = () => {
      const rows = rowsForLastTable();
      const thenable: any = Promise.resolve(rows);
      thenable.first = () => Promise.resolve(rows[0]);
      thenable.update = update;
      thenable.delete = deleteQuery;
      return thenable;
    };

    const where = vi.fn((_criteria: AnyValues) => buildWhereResult());

    // Tracks every whereIn call regardless of the chain (select vs delete).
    const whereIn = vi.fn();

    const whereInForSelect = (column: string, values: unknown[]) => {
      whereIn(column, values);
      return Promise.resolve(rowsForLastTable());
    };

    const whereInForDelete = (column: string, values: unknown[]) => {
      whereIn(column, values);
      return deleteImpl();
    };

    const deleteQuery = vi.fn(() => {
      const thenable: any = deleteImpl();
      thenable.where = where;
      thenable.whereIn = whereInForDelete;
      return thenable;
    });

    const insert = vi.fn((...args: InsertArgs) => {
      const thenable: any = insertImpl(...args);
      thenable.returning = () => thenable;
      thenable.onConflict = () => ({
        merge: () => thenable,
        ignore: () => thenable,
      });
      return thenable;
    });

    const update = vi.fn((values: AnyValues) => {
      const thenable: any = updateImpl(values);
      thenable.returning = () => thenable;
      thenable.where = (_criteria: AnyValues) => {
        const updateAfterWhere: any = updateImpl(values);
        updateAfterWhere.returning = () => updateAfterWhere;
        return updateAfterWhere;
      };
      return thenable;
    });

    const select = vi.fn((_columns: string | string[]) => ({
      where,
      whereIn: whereInForSelect,
    }));

    const table = vi.fn((tableName: string) => {
      lastTable = tableName;
      return { insert, where, whereIn, select, delete: deleteQuery, update };
    });

    return {
      knex: table as unknown as Knex,
      table,
      insert,
      where,
      whereIn,
      update,
      select,
      delete: deleteQuery,
    };
  }
}

export function fakeDatabase(): FakeDatabaseBuilder {
  return new FakeDatabaseBuilder();
}
