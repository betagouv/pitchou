<script lang="ts">
  import AccountMenu from "@pitchou/ui/AccountMenu.svelte";
  import pitchouLogo from "@pitchou/ui/pitchou-logo.svg";

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
  class="flex min-h-20 items-center border-b border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)]"
>
  <div class="pitchou-container flex flex-wrap items-center gap-x-6">
    <a href="/" title="Accueil - Pitchou" class="my-2 block max-w-full shrink-0 bg-none">
      <img
        src={pitchouLogo}
        alt="Pitchou"
        width="209"
        height="40"
        class="block h-auto max-w-full bg-white"
      />
    </a>

    <Navbar />

    <div class="ms-auto">
      <AccountMenu {email} {onLogout} />
    </div>
  </div>
</header>
