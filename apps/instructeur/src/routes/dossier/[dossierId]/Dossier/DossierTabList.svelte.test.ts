import "@gouvfr/dsfr/dist/dsfr.css";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import DossierTabList from "./DossierTabList.svelte";

afterEach(cleanup);

test("tabs override DSFR's stripe and blue inactive background with medium-weight neutral tabs", () => {
  const onSelect = vi.fn();
  render(DossierTabList, { activeTab: "instruction", onSelect });
  const tabs = screen.getAllByRole("tab");
  expect(tabs[0]).toHaveTextContent("Instruction");
  const active = getComputedStyle(tabs[0]);
  const inactive = getComputedStyle(tabs[1]);
  expect(active.fontWeight).toBe("500");
  expect(active.backgroundImage).toBe("none");
  expect(active.boxShadow).toBe("none");
  expect(active.backgroundColor).toBe("rgb(255, 255, 255)");
  expect(active.borderRadius).toBe("4px 4px 0px 0px");
  expect(inactive.backgroundColor).toBe("rgb(238, 238, 238)");
  expect(inactive.fontWeight).toBe("500");
  tabs[1].click();
  expect(onSelect).toHaveBeenCalledWith("detail-du-projet");
});
