<script lang="ts">
  import AccountMenu from "@pitchou/ui/AccountMenu.svelte";

  import Navbar from "./Navbar.svelte";

  type Props = {
    email: string;
    onLogout: () => void;
  };

  let { email, onLogout }: Props = $props();
</script>

<div class="fr-skiplinks">
  <nav aria-label="Accès rapide" class="fr-container">
    <ul class="fr-skiplinks__list">
      <li>
        <a class="fr-link" href="#main">Contenu</a>
      </li>
    </ul>
  </nav>
</div>

<!-- Signed-in instructeurs see Pitchou as an internal work tool: the official Marianne
     block gives way to a single compact menu band. Public pages keep the DSFR header. -->
<header
  class="border-b border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)]"
>
  <div class="flex flex-wrap items-center gap-x-6 px-4 lg:px-8">
    <a
      href="/"
      title="Accueil - Pitchou"
      class="fr-text--lg fr-mb-0 bg-none font-bold text-[color:var(--text-title-grey)] no-underline"
    >
      Pitchou
    </a>

    <Navbar />

    <div class="ms-auto">
      <AccountMenu {email} {onLogout} />
    </div>
  </div>
</header>
