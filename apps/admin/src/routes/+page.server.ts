import { env as privateEnv } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import { directDatabaseConnection } from "$lib/server/database.ts";
import type { PageServerLoad } from "./$types";

// Temporary probe to confirm the admin app can reach the shared database.
// Remove once admin has real database-backed features.
async function getDatabaseStatus(): Promise<string> {
  try {
    const { rows } = await directDatabaseConnection.raw<{ rows: { count: string }[] }>(
      "select count(*)::text as count from personne",
    );
    return `ok (${rows[0].count} personnes)`;
  } catch (error) {
    return `unreachable: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export type DashboardLink = {
  href: string;
  title: string;
  detail: string;
  icon: string;
};

export const load: PageServerLoad = async () => {
  const databaseStatus = await getDatabaseStatus();

  const candidates: { href: string | undefined; title: string; detail: string; icon: string }[] = [
    {
      href: publicEnv.PUBLIC_SITE_URL_PITCHOU,
      title: "Pitchou officiel",
      detail: "Le site public de Pitchou",
      icon: "fr-icon-home-4-line",
    },
    {
      href: privateEnv.URL_VISIO,
      title: "Visio",
      detail: "Salle de visioconférence de l'équipe",
      icon: "fr-icon-group-line",
    },
    {
      href: privateEnv.URL_WEBINAIRE,
      title: "Webinaire",
      detail: "Présentation et démo de Pitchou",
      icon: "fr-icon-video-chat-line",
    },
    {
      href: privateEnv.URL_GRIST_METRIQUES,
      title: "Grist métriques",
      detail: "Suivi des indicateurs produit",
      icon: "fr-icon-line-chart-line",
    },
    {
      href: privateEnv.URL_VAULTWARDEN,
      title: "Vaultwarden",
      detail: "Coffre-fort des secrets de l'équipe",
      icon: "fr-icon-lock-line",
    },
    {
      href: privateEnv.URL_PAD_RITUEL,
      title: "Pad rituel",
      detail: "Apprentissages, déploiement et point produit",
      icon: "fr-icon-file-text-line",
    },
  ];

  const links: DashboardLink[] = candidates.filter((link): link is DashboardLink =>
    Boolean(link.href),
  );

  return { links, databaseStatus };
};
