<script lang="ts">
  import PageHelp from "$lib/components/PageHelp.svelte";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
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
    Chaque dossier appartient à tous les groupes actifs qui couvrent son département principal.
    Plusieurs groupes peuvent donc partager un même dossier.
  </p>
  <p>
    Les affectations sont recalculées lorsque le département principal du dossier, les départements
    du groupe ou son état actif changent. Cela concerne aussi les dossiers existants, quelle que
    soit leur source.
  </p>
  <h3>Créer et modifier un groupe</h3>
  <p>
    Utilisez le bouton + pour créer un groupe. Cliquez sur une ligne pour modifier son nom, ses
    départements ou ses membres. « Tous » indique que le groupe couvre tous les départements
    proposés.
  </p>
  <p>
    Un groupe actif reçoit les dossiers de ses départements. Un groupe archivé ne reçoit plus de
    dossiers et ne donne plus d'accès à ses membres au titre de ce groupe. Sa configuration reste
    conservée.
  </p>
  <h3>Vérifications et alertes</h3>
  <p>
    Les groupes « À vérifier » sont actifs, mais leur couverture importée reste à confirmer.
    Vérifiez leurs départements, puis enregistrez.
  </p>
  <p>
    L'alerte signale les départements sans groupe actif. La page Dossiers signale les dossiers sans
    affectation. Pour affecter un dossier, renseignez son département principal et assurez-vous
    qu'un groupe actif le couvre.
  </p>
  <h3>Accès des membres</h3>
  <p>
    Un instructeur membre d'au moins un groupe actif peut consulter les dossiers des autres groupes
    en lecture seule. Il peut instruire les dossiers de ses groupes selon ses permissions.
  </p>
</PageHelp>
{#if form?.message}<p class="fr-alert fr-alert--error" role="alert">{form.message}</p>{/if}
{#if uncovered.length}<div id="uncovered-departments" class="fr-alert fr-alert--warning">
    <h2>Départements sans groupe</h2>
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
