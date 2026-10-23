export const SEND_NOVELTY_PATH = "/__fleet/send-novelty-emails";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function notificationPage(accounts: string[], params: URLSearchParams) {
  const count = Math.max(0, Math.min(100, Math.trunc(Number(params.get("sent") ?? "0")) || 0));
  const result = params.get("notifications");
  const message =
    result === "error"
      ? `L'envoi a échoué. ${count ? `${count} mail(s) envoyé(s). ` : ""}Réessayez dans une minute.`
      : result === "sent" && count
        ? `${count} mail${count > 1 ? "s" : ""} de nouveauté envoyé${count > 1 ? "s" : ""} dans la boîte locale.`
        : result === "empty"
          ? "Aucun mail de nouveauté à envoyer."
          : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
    <title>Comptes de test Pitchou</title><style>
    :root{color-scheme:dark light;font-family:system-ui,sans-serif;line-height:1.6}
    body{max-width:46rem;margin:3rem auto;padding:0 1.25rem}h1,h2{line-height:1.25}
    section{border:1px solid #8886;border-radius:.5rem;margin:2rem 0;padding:1.5rem}
    button{font:inherit;padding:.6rem 1rem;cursor:pointer;max-width:100%;white-space:normal;overflow-wrap:anywhere}
    form+form{margin-top:.75rem}a{color:light-dark(#000091,#aaaaff)}
    [role=status],[role=alert]{padding:1rem;border:1px solid #888;border-radius:.25rem}
    </style></head><body><h1>Comptes de test</h1>
    <p>Utilisez deux profils de navigateur ou une fenêtre privée pour tester avec deux personnes.</p>
    ${accounts.map((email, i) => `<form method="post" action="/__fleet/signin/${i}"><button>${escapeHtml(email)}</button></form>`).join("")}
    <section aria-labelledby="notifications-title"><h2 id="notifications-title">Tester les mails de nouveautés</h2>
    <p>Une autre personne doit suivre le dossier et avoir activé <strong>Nouveautés sur mes dossiers suivis</strong> dans <a href="/parametres">Mon espace &gt; Paramètres</a>. Modifiez ensuite le dossier avec votre compte.</p>
    <p>Ce bouton envoie les nouveautés en attente sans attendre 6 h, uniquement dans la boîte locale de cet aperçu. Plusieurs modifications sont regroupées par personne et dossier. Les actions personnelles, le suivi et la génération de documents sont exclus.</p>
    <form method="post" action="${SEND_NOVELTY_PATH}"><button>Envoyer les nouveautés en attente</button></form>
    ${message ? `<p role="${result === "error" ? "alert" : "status"}">${message}</p>` : ""}
    <p><a href="/__fleet/mail/">Ouvrir la boîte mail de test</a></p>
    <p>Un second clic sans nouvelle activité ne renvoie rien. Après une nouvelle modification, vous pouvez refaire le test. Jusqu'à 100 mails sont traités par clic. En cas d'échec, les reprises attendent une minute.</p>
    </section></body></html>`;
}
