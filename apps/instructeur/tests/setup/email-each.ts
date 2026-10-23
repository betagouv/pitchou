import { afterAll, beforeEach } from "vitest";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { truncateAll } from "./truncate.ts";

beforeEach(() => truncateAll(directDatabaseConnection));
afterAll(() => directDatabaseConnection.destroy());
