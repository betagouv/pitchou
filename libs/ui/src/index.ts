import type { Snippet } from "svelte";

// Shared DSFR page layout for every Pitchou app. The components hold the markup
// common to all apps; each app fills the variable regions via snippet props.

export type HeaderProps = {
  /** Service name shown in the header (e.g. "Pitchou"). */
  serviceTitle: string;
  /** Optional short line under the title. */
  serviceTagline?: string;
  /** Link target of the service block (defaults to "/"). */
  serviceHref?: string;
  /** Desktop tools area, rendered top-right (e.g. an account menu). */
  tools?: Snippet;
  /** Account links inside the mobile menu modal. */
  menuLinks?: Snippet;
  /** Navigation links inside the menu modal. */
  nav?: Snippet;
};

export type FooterProps = {
  /** Short description of the service, shown next to the brand. */
  description: string;
  /** App-specific "À propos" links at the top of the footer. */
  top?: Snippet;
  /** Extra items appended to the bottom links (e.g. a sync timestamp). */
  bottomExtra?: Snippet;
};

/** A link rendered in the account menu panel (e.g. an admin section). */
export type AccountMenuLink = {
  href: string;
  label: string;
  /** Optional DSFR icon class, e.g. "fr-icon-team-line". */
  icon?: string;
};

export type AccountMenuProps = {
  /** Signed-in user email; the menu omits the email line when absent. */
  email?: string;
  /** Logout handler; the logout action is hidden when not provided. */
  onLogout?: () => void;
  /** Side the panel opens on, under the button. */
  align?: "start" | "end";
  /** App-specific links (e.g. admin sections); none are shown when empty. */
  links?: AccountMenuLink[];
};
