import type { SessionUser } from "@pitchou/types/permissions.ts";
import type { ExternalApiPrincipal } from "#lib/server/externalApi/authentication.ts";
declare global {
  const __PITCHOU_ORIGIN__: string | null;
  interface Window {
    dsfr(element: HTMLElement): { modal: { conceal(): void } };
  }
  namespace App {
    interface Locals {
      user: SessionUser | null;
      externalApi?: ExternalApiPrincipal;
    }
  }
}
export {};
