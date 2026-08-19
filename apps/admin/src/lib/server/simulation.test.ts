import { afterEach, describe, expect, test } from "vitest";

import { simulationAllowed } from "./simulation.ts";

const initial = { env: process.env.PUBLIC_PITCHOU_ENV, node: process.env.NODE_ENV };

function setEnv(pitchou: string | undefined, node: string | undefined) {
  if (pitchou === undefined) delete process.env.PUBLIC_PITCHOU_ENV;
  else process.env.PUBLIC_PITCHOU_ENV = pitchou;
  if (node === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = node;
}

afterEach(() => setEnv(initial.env, initial.node));

describe("simulationAllowed", () => {
  test("jamais en production, même si NODE_ENV dit autre chose", () => {
    setEnv("production", "development");
    expect(simulationAllowed()).toBe(false);
  });

  test("jamais quand NODE_ENV est production, même sans PUBLIC_PITCHOU_ENV", () => {
    setEnv(undefined, "production");
    expect(simulationAllowed()).toBe(false);
  });

  test("disponible en recette et en développement", () => {
    setEnv("staging", "production-like");
    expect(simulationAllowed()).toBe(true);
    setEnv(undefined, undefined);
    expect(simulationAllowed()).toBe(true);
  });
});
