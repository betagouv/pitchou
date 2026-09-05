import { refreshDossierFull } from "$lib/dossier/dossier.ts";
import { RequestError } from "$lib/shared/createCapObjectFromURLs/requestWrappers.ts";
import { sendCnpnEmail } from "../sendCnpnEmail.ts";
import type { DossierFull, SendCnpnEmailRequest } from "@pitchou/types/API_Pitchou.ts";

export function createSubmission(getDossierId: () => DossierFull["id"]) {
  const requestId = crypto.randomUUID();
  const state = $state({
    sending: false,
    submitted: false,
    retryAllowed: false,
    sent: false,
    errorMessage: "",
  });

  async function send(draft: Omit<SendCnpnEmailRequest, "requestId">) {
    state.submitted = true;
    state.retryAllowed = false;
    state.sending = true;
    state.errorMessage = "";
    try {
      await sendCnpnEmail(getDossierId(), { ...draft, requestId });
      state.sent = true;
      try {
        await refreshDossierFull(getDossierId());
      } catch {
        // Sending succeeded. A later dossier refresh will load the history entry.
      }
    } catch (error) {
      if (error instanceof RequestError) {
        if (error.status === 502) state.retryAllowed = true;
        else if (![425, 504].includes(error.status)) state.submitted = false;
      } else {
        // A lost browser response is safe to retry with the same frozen request ID.
        state.retryAllowed = true;
      }
      state.errorMessage =
        error instanceof Error && error.message
          ? error.message
          : "Le mail n'a pas pu être envoyé. Réessayez dans quelques instants.";
    } finally {
      state.sending = false;
    }
  }

  return { state, send };
}
