<script lang="ts">
  import PageHelp from "#lib/components/PageHelp.svelte";
  import { pageHeader } from "#lib/pageHeader.svelte.ts";
  import GroupsTable from "./GroupsTable.svelte";
  import GroupEditor from "./GroupEditor.svelte";
  import type { PageData, ActionData } from "./$types";
  let { data, form }: { data: PageData; form: ActionData } = $props();
  let selected = $state<string | null>(null);
  let editorOpen = $state(false);
  const sections = $derived([
    { title: "À vérifier", groups: data.groups.filter((g) => g.active && g.coverage_needs_review) },
    { title: "Actifs", groups: data.groups.filter((g) => g.active && !g.coverage_needs_review) },
    { title: "Archivés", groups: data.groups.filter((g) => !g.active) },
  ]);
  $effect(() => {
    pageHeader.setAction({ label: "Créer un groupe", onClick: () => select(null) });
    return () => pageHeader.clearAction();
  });
  const uncovered = $derived(
    data.departments.filter(
      (department) =>
        !data.groups.some((group) => group.active && group.departments.includes(department)),
    ),
  );
  function select(id: string | null) {
    selected = id;
    editorOpen = true;
  }
</script>

<PageHelp title="Groupes instructeurs">
  <h3>Répartition des dossiers</h3>
  <p>
    Chaque dossier est affecté à tous les groupes actifs dont une règle correspond. Les critères
    d'une règle se combinent avec ET, les règles avec OU.
  </p>
  <p>
    Les critères portent sur le département principal, les communes du projet par code INSEE et
    l'activité principale du référentiel Pitchou. Un critère vide n'impose aucune restriction. Pour
    les communes, une seule correspondance suffit.
  </p>
  <h3>Créer et modifier un groupe</h3>
  <p>
    Cliquez sur une ligne pour modifier le nom, les règles ou les membres. Un groupe sans règle
    reçoit uniquement des affectations manuelles.
  </p>
  <p>
    Vérifiez l'aperçu des dossiers ajoutés et retirés avant d'enregistrer. Ce recalcul des dossiers
    existants n'envoie pas d'e-mail d'arrivée. Les nouvelles arrivées ordinaires conservent leurs
    notifications.
  </p>
  <p>
    Un groupe archivé ne donne plus d'accès. Ses règles et exceptions sont conservées pour une
    éventuelle réactivation.
  </p>
  <h3>Affectations manuelles et exclusions</h3>
  <p>
    La fiche d'un dossier affiche l'origine de ses affectations. Vous pouvez inclure un groupe
    manuellement, exclure durablement un dossier d'un groupe ou rétablir les règles automatiques.
    Ces exceptions persistent après recalcul.
  </p>
  <h3>Vérifications et alertes</h3>
  <p>
    Les groupes « À vérifier » attendent une confirmation de leur couverture importée. L'alerte
    indique les départements sans couverture automatique complète. Des règles conditionnelles
    peuvent néanmoins y affecter certains dossiers. La page Dossiers signale les dossiers
    effectivement sans affectation.
  </p>
  <h3>Accès des membres</h3>
  <p>
    Un instructeur membre d'au moins un groupe actif peut consulter les dossiers des autres groupes
    en lecture seule. Il peut instruire les dossiers de ses groupes selon ses permissions.
  </p>
</PageHelp>
{#if form?.message}<p class="fr-alert fr-alert--error" role="alert">{form.message}</p>{/if}
{#if uncovered.length}<div id="uncovered-departments" class="fr-alert fr-alert--warning">
    <h2>Départements sans couverture automatique complète</h2>
    <p>{uncovered.join(", ")}</p>
  </div>{/if}
{#each sections as section}
  <GroupsTable
    title={section.title}
    groups={section.groups}
    departments={data.departments}
    onSelect={select}
  />
{/each}
{#if editorOpen}
  <GroupEditor
    {data}
    current={data.groups.find((group) => group.id === selected)}
    onClose={() => (editorOpen = false)}
  />
{/if}
