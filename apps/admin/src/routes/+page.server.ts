import { env as privateEnv } from "$env/dynamic/private";
import { env as publicEnv } from "$env/dynamic/public";
import type { PageServerLoad } from "./$types";

export type DashboardLink = {
  href: string;
  title: string;
  detail: string;
  icon: string;
};

export const load: PageServerLoad = async () => {
  const candidates: { href: string | undefined; title: string; detail: string; icon: string }[] = [
    {
      href: publicEnv.PUBLIC_SITE_URL_PITCHOU,
      title: "Pitchou officiel",
      detail: "Le site public de Pitchou",
      icon: "fr-icon-home-4-line",
    },
    {
      href: privateEnv.URL_STAGING,
      title: "Pitchou Staging",
      detail: "L'environnement de test de Pitchou",
      icon: "fr-icon-test-tube-line",
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
    {
      href: privateEnv.URL_FICHIERS,
      title: "Fichiers",
      detail: "Espace de stockage des fichiers de l'équipe",
      icon: "fr-icon-folder-2-line",
    },
    {
      href: privateEnv.URL_GOOGLE_DRIVE,
      title: "Google Drive",
      detail: "Documents partagés de l'équipe",
      icon: "fr-icon-google-line",
    },
  ];

  const links: DashboardLink[] = candidates.filter((link): link is DashboardLink =>
    Boolean(link.href),
  );

  return { links };
};
