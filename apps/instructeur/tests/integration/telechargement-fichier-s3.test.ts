import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichierS3 } from "../factories/fichier.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

test("GET /avis-expert/fichier/[id] sert un fichier stocké sur S3 avec son contenu intact", async () => {
  const s3 = await getTestS3();
  const bytes = Buffer.from("S3-backed PDF content");
  const fichier = await createFichierS3(db, s3, { name: "saisine-s3.pdf", bytes });

  const res = await fetch(`${INTEGRATION_BASE_URL}/avis-expert/fichier/${fichier.id}`);

  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("application/pdf");
  const body = Buffer.from(await res.arrayBuffer());
  expect(body.equals(bytes)).toBe(true);
});

test("GET /avis-expert/fichier/[id] expose un seul content-disposition même pour un fichier S3", async () => {
  const s3 = await getTestS3();
  const fichier = await createFichierS3(db, s3, { name: "avis été 2025.pdf" });

  const res = await fetch(`${INTEGRATION_BASE_URL}/avis-expert/fichier/${fichier.id}`);

  const cd = res.headers.get("content-disposition") ?? "";
  expect(cd).toMatch(/^attachment;/i);
  expect(cd).not.toMatch(/,\s*attachment/i);
  expect(cd).toMatch(/filename="[^"]*"/i);
  expect(cd).toMatch(/filename\*=UTF-8''/i);
});
