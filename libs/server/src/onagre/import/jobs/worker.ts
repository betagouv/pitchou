import type { Knex } from "knex";
import { processImportJob } from "./process.ts";

// Work is committed one batch at a time. Database locks arbitrate multiple instances;
// unfinished transactions roll back on exit and the next process resumes them.
export function startImportWorker(db: Knex) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function tick() {
    if (stopped) return;
    let worked = false;
    try {
      if (process.env.ONAGRE_DEPLOYMENT_ROLE === "rehearsal") worked = await processImportJob(db);
    } catch {
      console.error("Onagre worker temporarily unavailable; retrying in 5 seconds.");
    }
    if (!stopped) timer = setTimeout(() => void tick(), worked ? 50 : 5000).unref();
  }
  timer = setTimeout(() => void tick(), 0).unref();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
