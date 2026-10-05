<script lang="ts">
  import { profiles, userName, type User } from "../model.ts";
  let {
    current,
    formId,
    email = $bindable(""),
    active = $bindable(true),
    bundles = $bindable<string[]>([]),
  }: {
    current: User | undefined;
    formId: string;
    email: string;
    active: boolean;
    bundles: string[];
  } = $props();
</script>

<section class="editor-section" aria-labelledby={formId + "-account"}>
  <h3 class="section-heading" id={formId + "-account"}>Compte</h3>
  <div class="section-content">
    <div>
      {#if current && userName(current) !== email}<p class="person-name">
          {userName(current)}
        </p>{/if}
      <label class="field-label" for={formId + "-email"}>Adresse e-mail professionnelle</label>
      <input
        class="email-input"
        id={formId + "-email"}
        name="email"
        type="email"
        required
        bind:value={email}
        readonly={!!current}
        autocomplete="off"
        data-form-type="other"
        data-1p-ignore
        data-lpignore="true"
        data-bwignore="true"
        data-protonpass-ignore="true"
        aria-describedby={formId + "-email-help"}
      />
      <p class="help" id={formId + "-email-help"}>
        {current
          ? "L'identité et l'adresse e-mail proviennent de ProConnect."
          : "Utilisez l'adresse du futur compte ProConnect. Les accès seront prêts dès sa première connexion."}
      </p>
    </div>
    <label class="account-status">
      <span
        ><span class="field-label">Compte actif</span><span
          class="help"
          id={formId + "-active-help"}
          >{active
            ? "L'utilisateur peut se connecter et utiliser les accès accordés ci-dessous. Désactiver le compte coupe ses sessions et bloque ses accès, sans supprimer ses données."
            : "L'utilisateur ne peut plus accéder à Pitchou. Ses profils et ses groupes sont conservés pour une éventuelle réactivation."}</span
        ></span
      >
      <input
        class="status-checkbox"
        type="checkbox"
        role="switch"
        name="active"
        bind:checked={active}
        aria-label="Compte actif"
        aria-describedby={formId + "-active-help"}
      />
      <span class="toggle" aria-hidden="true"></span>
    </label>
  </div>
</section>
<section class="editor-section" aria-labelledby={formId + "-profiles"}>
  <h3 class="section-heading" id={formId + "-profiles"}>Profils d'accès</h3>
  <fieldset class="profiles section-content" aria-labelledby={formId + "-profiles"}>
    <p class="help">
      Choisissez les profils adaptés à cet utilisateur. Leurs permissions se cumulent.
    </p>
    <div class="profile-grid">
      {#each Object.entries(profiles) as [value, profile]}
        <label class="profile-card" class:selected={bundles.includes(value)}>
          <input
            type="checkbox"
            name="bundles"
            {value}
            bind:group={bundles}
            aria-label={profile.label}
          />
          <span
            ><strong>{profile.label}</strong><span class="help">{profile.description}</span></span
          >
        </label>
      {/each}
    </div>
  </fieldset>
</section>
