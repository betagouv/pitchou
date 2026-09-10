import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichierAvisAccessible } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

test("GET /avis-expert/fichier/[id] renvoie un seul en-tête Content-Disposition", async () => {
  const s3 = await getTestS3();
  const { url } = await createFichierAvisAccessible(db, s3, { name: "saisine.pdf" });

  const res = await fetch(`${INTEGRATION_BASE_URL}${url}`);

  expect(res.status).toBe(200);

  // undici joins repeated headers with ", ". A well-formed single
  // content-disposition uses "; " between parameters and has no top-level ",".
  const contentDisposition = res.headers.get("content-disposition");
  expect(contentDisposition).not.toBeNull();
  expect(contentDisposition).not.toMatch(/,\s*attachment/i);
});

test("GET /avis-expert/fichier/[id] expose filename et filename* dans un seul en-tête", async () => {
  const s3 = await getTestS3();
  const { url } = await createFichierAvisAccessible(db, s3, { name: "avis été 2025.pdf" });

  const res = await fetch(`${INTEGRATION_BASE_URL}${url}`);

  const contentDisposition = res.headers.get("content-disposition") ?? "";
  expect(contentDisposition).toMatch(/^attachment;/i);
  expect(contentDisposition).toMatch(/filename="[^"]*"/i);
  expect(contentDisposition).toMatch(/filename\*=UTF-8''/i);
});
