// Sidebar entries and the per-path header titles of the admin shell.

export type NavItem = { href: string; label: string; icon: string };

export const NAV: NavItem[] = [
  { href: "/", label: "Accueil", icon: "fr-icon-home-4-line" },
  { href: "/dossiers", label: "Dossiers", icon: "fr-icon-folder-2-line" },
  { href: "/aarri", label: "Utilisateurs", icon: "fr-icon-team-line" },
  { href: "/especes-protegees", label: "Espèces protégées", icon: "fr-icon-leaf-line" },
  { href: "/activites", label: "Activités", icon: "fr-icon-briefcase-line" },
  { href: "/evenements", label: "Évènements", icon: "fr-icon-calendar-event-line" },
  { href: "/mails", label: "Mails", icon: "fr-icon-mail-line" },
  { href: "/changelog", label: "Changelog", icon: "fr-icon-newspaper-line" },
  { href: "/tech", label: "Tech", icon: "fr-icon-terminal-line" },
];

export function isNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export type PageInfo = { title: string; backHref?: string };

const CHANGELOG_ENTRY = /^\/changelog\/\d+$/;

/**
 * The shell header owns the page `<h1>`: title (and optional back arrow) come
 * from the path. Pages therefore do not render their own h1.
 */
export function pageInfoFor(pathname: string): PageInfo {
  if (pathname === "/") return { title: "Tableau de bord" };
  if (pathname === "/dossiers") return { title: "Dossiers" };
  if (pathname === "/dossiers/nouveau") {
    return { title: "Créer une demande de dérogation", backHref: "/dossiers" };
  }
  if (pathname.startsWith("/dossiers/")) return { title: "Dossier", backHref: "/dossiers" };
  if (pathname === "/aarri") return { title: "Utilisateurices et niveau AARRI" };
  if (pathname === "/especes-protegees") return { title: "Espèces protégées modifiées" };
  if (pathname === "/activites") return { title: "Activités et regroupement des libellés" };
  if (pathname === "/evenements") return { title: "Évènements suivis" };
  if (pathname === "/mails") return { title: "Mails" };
  if (pathname === "/changelog") return { title: "Changelog" };
  if (pathname === "/tech") return { title: "Tech" };
  if (CHANGELOG_ENTRY.test(pathname)) {
    // The editor registers the real title (« Entrée du <date> ») itself.
    return { title: "Entrée du changelog", backHref: "/changelog" };
  }
  return { title: "Administration" };
}
