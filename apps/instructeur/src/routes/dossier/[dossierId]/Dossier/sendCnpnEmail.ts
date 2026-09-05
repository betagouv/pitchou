import { store } from "$lib/state/store.svelte.ts";
import type { SendCnpnEmailRequest } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

export function sendCnpnEmail(dossierId: Dossier["id"], email: SendCnpnEmailRequest) {
  if (!store.capabilities.envoyerEmailCnpn) {
    throw new TypeError("Capability envoyerEmailCnpn manquante");
  }
  return store.capabilities.envoyerEmailCnpn(dossierId, email);
}
