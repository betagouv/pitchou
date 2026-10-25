import { readOptions, safeFailure } from "./transfer/connection.ts";
import { runTransfer } from "./transfer/run.ts";

try {
  const options = readOptions(process.argv.slice(2), process.env);
  const result = await runTransfer(options, (table) => {
    // Each table is still uncommitted until the final applied result is printed.
    console.log(JSON.stringify({ mode: "copying", ...table }));
  });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(safeFailure(error));
  process.exitCode = 1;
}
