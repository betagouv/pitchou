import { readAccount, withAccountRead } from "#lib/server/externalApi/account.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals }) => withAccountRead(locals, readAccount);
