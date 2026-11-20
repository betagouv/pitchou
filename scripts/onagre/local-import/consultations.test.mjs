import assert from "node:assert/strict";
import test from "node:test";
import { prepareConsultations } from "./consultations.mjs";

const prepare = (saisines, responses) =>
  prepareConsultations({
    source: {
      rows: {
        avisserviceinstructeur: saisines.map((dateavis, index) => ({
          avisserviceinstructeurid: String(index + 1),
          dateavis,
        })),
        avisreglementaires: responses.map((dateavis, index) => ({
          avisreglementairesid: String(index + 1),
          organismeexpertsid: "1",
          dateavis,
        })),
        organismeexperts: [{ organismeexpertsid: "1", liborganisme: "CNPN - (à préciser)" }],
      },
    },
  });

test("links a response within four calendar months and keeps undated responses", () => {
  const items = prepare(["2023-10-31", "2022-03-01"], ["2024-02-29", null]);
  assert.equal(items[0].relatedResponseDate, "2024-02-29");
  assert.equal(items[2].relatedSaisineDate, "2023-10-31");
  assert.equal(items[3].responseDate, null);
  assert.equal(items[3].relatedKey, undefined);
});

test("leaves competing responses or saisines unlinked", () => {
  for (const items of [
    prepare(["2024-01-01", "2024-02-01"], ["2024-03-01"]),
    prepare(["2024-01-01"], ["2024-02-01", "2024-03-01"]),
    prepare(["2023-10-31"], ["2024-03-01"]),
  ])
    assert(items.every((record) => record.relatedKey === undefined));
});

test("uses an uncontested saisine file and the matching transmission day", () => {
  const source = {
    rows: {
      avisserviceinstructeur: [
        { avisserviceinstructeurid: "1", dateavis: "2024-01-15" },
        { avisserviceinstructeurid: "2", dateavis: "2024-02-15" },
      ],
      avisreglementaires: [
        {
          avisreglementairesid: "3",
          organismeexpertsid: "1",
          dateavis: "2024-03-21",
          datetransmissionorganismeoudeb: "2024-02-15",
        },
      ],
      organismeexperts: [{ organismeexpertsid: "1", liborganisme: "CNPN" }],
      piecesjointes: [
        { piecesjointesid: "1", avisserviceinstructeurid: "2", nompj: "20240215_Saisine_CNPN.pdf" },
      ],
    },
  };
  const items = prepareConsultations({ source });
  assert.equal(items[2].relatedKey, items[1].key);
  assert.equal(items[2].associationBasis, "saisine_file_and_transmission");
  source.rows.piecesjointes[0].nompj = "20240214_Saisine_CNPN.pdf";
  assert(prepareConsultations({ source }).every((item) => item.relatedKey === undefined));
});
