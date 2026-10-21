import type { SessionUser } from "@pitchou/types/permissions.ts";
declare global {
  interface Window {
    dsfr(element: HTMLElement): { modal: { conceal(): void } };
  }
  namespace App {
    interface Locals {
      user: SessionUser | null;
    }
  }
}
export {};
