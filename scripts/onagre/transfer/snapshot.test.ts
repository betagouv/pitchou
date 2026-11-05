import assert from "node:assert/strict";
import { test } from "node:test";
import { createFixture } from "./fixtures.ts";
import { readOptions } from "./connection.ts";
import { runTransfer } from "./run.ts";

test("source edits during streaming stay outside the source read-only snapshot", async () => {
  const fixture = await createFixture();
  try {
    const options = readOptions(["--apply"], {
      ONAGRE_DEPLOYMENT_ROLE: "rehearsal",
      ONAGRE_TRANSFER_SOURCE_URL: fixture.sourceUrl,
      DATABASE_URL: fixture.targetUrl,
      ONAGRE_EXPECTED_DATABASE: new URL(fixture.targetUrl).pathname.slice(1),
    });
    await runTransfer(options, async ({ table }) => {
      if (table === "onagre_snapshot") {
        await fixture.source.query("update onagre_mapping set label='concurrent edit'");
        await fixture.source.query("insert into onagre_source_row values (17,'fixture',2502,'{}')");
      }
    });
    assert.equal(
      (await fixture.target.query("select label from onagre_mapping")).rows[0].label,
      "label",
    );
    assert.equal(
      (await fixture.source.query("select label from onagre_mapping")).rows[0].label,
      "concurrent edit",
    );
    assert.equal(
      (await fixture.target.query("select count(*)::int as count from onagre_source_row")).rows[0]
        .count,
      2501,
    );
    assert.equal(
      (await fixture.source.query("select count(*)::int as count from onagre_source_row")).rows[0]
        .count,
      2502,
    );
  } finally {
    await fixture.cleanup();
  }
});
