import { error, json } from "@sveltejs/kit";
import { requireUserId } from "#lib/server/auth.ts";
import { readJsonObject, rejectUnknownProperties } from "#lib/server/requestValidation.ts";
import {
  addGroupMember,
  removeGroupMember,
  GroupMembershipError,
} from "@pitchou/server/groupMembership.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { RequestHandler } from "./$types";
import { searchGroupMemberCandidates } from "@pitchou/server/groupMembership/search.ts";

export const GET: RequestHandler = async ({ locals, params, url }) => {
  const actor = requireUserId(locals);
  const search = url.searchParams.get("q") ?? "";
  if (search.length > 254) error(400, "Recherche trop longue.");
  try {
    return json(await searchGroupMemberCandidates(actor, params.groupeId, search), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (cause) {
    if (cause instanceof GroupMembershipError) error(cause.status, cause.message);
    throw cause;
  }
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const actor = requireUserId(locals);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["email"]));
  if (typeof body.email !== "string") error(400, "Adresse e-mail requise.");
  try {
    await addGroupMember(actor, params.groupeId, body.email);
    return json({ ok: true });
  } catch (cause) {
    if (cause instanceof GroupMembershipError) error(cause.status, cause.message);
    throw cause;
  }
};

export const DELETE: RequestHandler = async ({ locals, params, request }) => {
  const actor = requireUserId(locals);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["userId"]));
  if (
    typeof body.userId !== "number" ||
    !Number.isSafeInteger(body.userId) ||
    body.userId < 1 ||
    body.userId > 2147483647
  )
    error(400, "Utilisateur invalide.");
  try {
    await removeGroupMember(actor, params.groupeId, body.userId as UserId);
    return json({ ok: true });
  } catch (cause) {
    if (cause instanceof GroupMembershipError) error(cause.status, cause.message);
    throw cause;
  }
};
