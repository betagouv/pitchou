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
  test("disponible en recette, qui tourne pourtant avec NODE_ENV=production", () => {
    // Staging is deployed like production: only PUBLIC_PITCHOU_ENV distinguishes them.
    setEnv("staging", "production");
    expect(simulationAllowed()).toBe(true);
  });

  test("jamais en production", () => {
    setEnv("production", "production");
    expect(simulationAllowed()).toBe(false);
  });

  test("un environnement mal orthographié n'ouvre pas l'outil", () => {
    setEnv("prod", "production");
    expect(simulationAllowed()).toBe(false);
    setEnv("recette", "production");
    expect(simulationAllowed()).toBe(false);
  });

  test("sans environnement nommé, disponible en local mais pas dans un build déployé", () => {
    setEnv(undefined, undefined);
    expect(simulationAllowed()).toBe(true);
    setEnv("", "development");
    expect(simulationAllowed()).toBe(true);
    setEnv(undefined, "production");
    expect(simulationAllowed()).toBe(false);
  });
});
