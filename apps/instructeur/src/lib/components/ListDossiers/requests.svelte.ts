import type {
  DossiersListOptions,
  DossiersListPage,
  DossiersListScope,
} from "@pitchou/types/dossierList.ts";
import { loadDossiersOptions, loadDossiersPage } from "./transport.ts";

export function createServerDossiers() {
  let result = $state<DossiersListPage>();
  let options = $state<DossiersListOptions>();
  let busy = $state(true);
  let error = $state("");
  let controller: AbortController | undefined;
  let version = 0;
  let optionsScope: DossiersListScope | undefined;

  function cancel() {
    version++;
    controller?.abort();
  }

  async function load(scope: DossiersListScope, query: string, refreshOptions = false) {
    cancel();
    const requestVersion = version;
    controller = new AbortController();
    busy = true;
    error = "";
    try {
      const [next, nextOptions] = await Promise.all([
        loadDossiersPage(scope, query, controller.signal),
        !options || optionsScope !== scope || refreshOptions
          ? loadDossiersOptions(scope, controller.signal)
          : options,
      ]);
      if (version !== requestVersion) return;
      options = nextOptions;
      optionsScope = scope;
      result = next;
      return next;
    } catch (cause) {
      if (version !== requestVersion) return;
      controller.abort();
      error = /\b(401|403)\b/u.test(String(cause))
        ? "Votre lien de connexion n'est plus valide. Reconnectez-vous pour charger vos dossiers."
        : "Le chargement des dossiers a échoué. Veuillez réessayer.";
    } finally {
      if (version === requestVersion) busy = false;
    }
  }

  return {
    load,
    cancel,
    get result() {
      return result;
    },
    get options() {
      return options;
    },
    get busy() {
      return busy;
    },
    get error() {
      return error;
    },
  };
}
