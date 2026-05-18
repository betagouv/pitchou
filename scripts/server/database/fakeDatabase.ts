import { vi } from "vitest";
import type { Knex } from "knex";

type AnyValues = Record<string, unknown>;
type InsertArgs = [values: AnyValues | AnyValues[], returning?: string | string[]];

class FakeDatabaseBuilder {
  private insertImpl: (...args: InsertArgs) => Promise<unknown> = () => Promise.resolve([1]);
  private updateImpl: (values: AnyValues) => Promise<unknown> = () => Promise.resolve(1);

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

  build() {
    const insert = vi.fn(this.insertImpl);
    const update = vi.fn(this.updateImpl);
    const where = vi.fn((_criteria: AnyValues) => ({ update }));
    const table = vi.fn((_name: string) => ({ insert, where }));
    return {
      knex: table as unknown as Knex,
      table,
      insert,
      where,
      update,
    };
  }
}

export function fakeDatabase(): FakeDatabaseBuilder {
  return new FakeDatabaseBuilder();
}
