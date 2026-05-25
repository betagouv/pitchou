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
    const insert = vi.fn(this.insertImpl);
    const update = vi.fn(this.updateImpl);
    const deleteImpl = this.deleteImpl;
    const defaultRows = this.defaultSelectRows;
    const rowsByTable = this.selectRowsByTable;
    // SELECT response depends on the most recent table(...) call, so we track it here.
    let lastTable = "";

    const where = vi.fn((_criteria: AnyValues) => {
      const rows = rowsByTable.get(lastTable) ?? defaultRows;
      const result: any = Promise.resolve(rows);
      result.update = update;
      result.delete = del;
      return result;
    });

    const whereIn = vi.fn((_column: string, _values: unknown[]) => deleteImpl());

    const del = vi.fn(() => {
      const promise: any = deleteImpl();
      promise.where = where;
      promise.whereIn = whereIn;
      return promise;
    });

    const select = vi.fn((_columns: string | string[]) => ({ where }));

    const table = vi.fn((name: string) => {
      lastTable = name;
      return { insert, where, whereIn, select, delete: del };
    });

    return {
      knex: table as unknown as Knex,
      table,
      insert,
      where,
      whereIn,
      update,
      select,
      delete: del,
    };
  }
}

export function fakeDatabase(): FakeDatabaseBuilder {
  return new FakeDatabaseBuilder();
}
