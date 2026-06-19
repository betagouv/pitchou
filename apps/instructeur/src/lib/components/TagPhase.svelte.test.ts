import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "@testing-library/svelte";
import TagPhase from "./TagPhase.svelte";

test("affiche le libellé de la phase et la classe fr-tag", async () => {
  render(TagPhase, { phase: "Instruction", taille: "SM" });

  const tag = page.getByText("Instruction");
  await expect.element(tag).toBeVisible();
  await expect.element(tag).toHaveClass(/fr-tag/);
});

test("applique la classe spécifique à chaque phase connue", async () => {
  const cases = [
    { phase: "Accompagnement amont", className: "phase--accompagnement-amont" },
    { phase: "Instruction", className: "phase--instruction" },
    { phase: "Contrôle", className: "phase--contrôle" },
  ] as const;

  for (const { phase, className } of cases) {
    const { container, unmount } = render(TagPhase, { phase });
    const el = container.querySelector(".fr-tag");
    expect(el?.className).toContain(className);
    unmount();
  }
});
