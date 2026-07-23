import { expect, test, describe } from "vitest";

import { serviceLabel } from "./dossiersList.ts";

describe("serviceLabel", () => {
  test("keeps the singular wording, without a name, when no service is known", () => {
    expect(serviceLabel([])).toBe("dossiers dans votre service");
  });

  test("appends the name after « votre service » for a single service", () => {
    expect(serviceLabel(["DDTM 44"])).toBe("dossiers dans votre service : DDTM 44");
  });

  test("switches to « vos services » and joins the names for several services", () => {
    expect(serviceLabel(["DDTM 44", "DREAL Bretagne"])).toBe(
      "dossiers dans vos services : DDTM 44, DREAL Bretagne",
    );
  });
});
