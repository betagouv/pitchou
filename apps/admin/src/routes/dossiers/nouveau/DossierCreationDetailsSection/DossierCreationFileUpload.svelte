<script lang="ts">
  import { getFileAccess } from "../../fileAccess.ts";
  const fileAccess = getFileAccess();
  import { uploadSizeError, uploadSizeHint } from "$lib/upload/uploadLimit.svelte.ts";

  type Props = {
    id: string;
    label: string;
    description?: string;
    required?: boolean;
    uploadedFiles: File[];
  };

  let {
    id,
    label,
    description = "",
    required = false,
    uploadedFiles = $bindable(),
  }: Props = $props();
  let input = $state<HTMLInputElement>();
  let error = $state("");

  function setFiles(files: File[]) {
    if (!fileAccess.attachments()) return;
    error = uploadSizeError(files) ?? "";
    if (error) return;
    uploadedFiles = files;
  }
</script>

<div class="fr-upload-group fr-mb-2w">
  <label class="fr-label" for={id}
    >{label}{#if required}
      *{/if}<span class="fr-hint-text">{uploadSizeHint()} Plusieurs fichiers possibles</span
    >{#if description}<span class="fr-hint-text whitespace-pre-line">{description}</span
      >{/if}</label
  >
  <div
    class="border-2 border-dashed border-[color:var(--border-default-grey)] fr-p-4w text-center"
    role="group"
    aria-label={label}
    ondragover={(event) => event.preventDefault()}
    ondrop={(event) => {
      event.preventDefault();
      if (event.dataTransfer) setFiles([...event.dataTransfer.files]);
    }}
  >
    <span class="fr-icon-upload-line fr-icon--lg" aria-hidden="true"></span>
    <p class="fr-mb-2w">Faites glisser et déposez vos fichiers ici</p>
    <span class="fr-mx-2w">OU</span>
    <button class="fr-btn fr-btn--secondary" type="button" onclick={() => input?.click()}
      >Choisir des fichiers</button
    >
    <input
      class="fr-sr-only"
      {id}
      type="file"
      disabled={!fileAccess.attachments()}
      multiple
      {required}
      bind:this={input}
      onchange={(event) => setFiles([...(event.currentTarget.files ?? [])])}
    />
  </div>
  {#if error}<p class="fr-error-text" role="alert">{error}</p>{/if}
  {#if uploadedFiles.length >= 1}
    <ul class="fr-mt-2w">
      {#each uploadedFiles as file, index (`${file.name}-${file.size}-${index}`)}<li>
          {file.name}
        </li>{/each}
    </ul>
  {/if}
</div>
