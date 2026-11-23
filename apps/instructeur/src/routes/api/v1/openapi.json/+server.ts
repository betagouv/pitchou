import { json } from "@sveltejs/kit";
import openApi from "#lib/server/externalApi/openapi.json";

export const GET = () => json(openApi);
