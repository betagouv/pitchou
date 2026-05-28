<script lang="ts">
  import { onMount } from "svelte";

  type ObjectInfo = { key: string; size: number; lastModified: string | null };

  let file: File | undefined = $state();
  let uploadStatus: "idle" | "uploading" | "done" | "error" = $state("idle");
  let uploadError: string | undefined = $state();
  let uploadResult: { key: string; size: number; name: string } | undefined = $state();

  let objects: ObjectInfo[] = $state([]);
  let listLoading = $state(false);
  let listError: string | undefined = $state();

  function onFileChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    file = target.files?.[0];
  }

  async function loadList() {
    listLoading = true;
    listError = undefined;
    try {
      const res = await fetch("");
      if (!res.ok) {
        listError = `${res.status} ${await res.text()}`;
        return;
      }
      const data = (await res.json()) as { objects: ObjectInfo[] };
      objects = data.objects;
    } catch (err) {
      listError = err instanceof Error ? err.message : String(err);
    } finally {
      listLoading = false;
    }
  }

  async function upload() {
    if (!file) return;
    uploadStatus = "uploading";
    uploadError = undefined;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("", { method: "POST", body: formData });
      if (!res.ok) {
        uploadError = `${res.status} ${await res.text()}`;
        uploadStatus = "error";
        return;
      }
      uploadResult = await res.json();
      uploadStatus = "done";
      await loadList();
    } catch (err) {
      uploadError = err instanceof Error ? err.message : String(err);
      uploadStatus = "error";
    }
  }

  async function deleteObject(key: string) {
    if (!confirm(`Delete ${key}?`)) return;
    try {
      const res = await fetch(`?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!res.ok) {
        alert(`Delete failed: ${res.status} ${await res.text()}`);
        return;
      }
      await loadList();
    } catch (err) {
      alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  onMount(loadList);
</script>

<h1>Bucket test page</h1>

<section>
  <h2>Upload</h2>
  <input type="file" onchange={onFileChange} disabled={uploadStatus === "uploading"} />
  <button onclick={upload} disabled={!file || uploadStatus === "uploading"}>
    {uploadStatus === "uploading" ? "Uploading…" : "Upload"}
  </button>
  {#if uploadStatus === "done" && uploadResult}
    <p>
      Uploaded <code>{uploadResult.name}</code> ({uploadResult.size} bytes) → <code
        >{uploadResult.key}</code
      >
    </p>
  {:else if uploadStatus === "error"}
    <p style="color: red">{uploadError}</p>
  {/if}
</section>

<section>
  <h2>Files in bucket</h2>
  <button onclick={loadList} disabled={listLoading}>
    {listLoading ? "Loading…" : "Refresh"}
  </button>
  {#if listError}
    <p style="color: red">{listError}</p>
  {:else if objects.length === 0 && !listLoading}
    <p>Bucket is empty.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Key</th>
          <th>Size</th>
          <th>Last modified</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each objects as obj (obj.key)}
          <tr>
            <td><code>{obj.key}</code></td>
            <td>{formatBytes(obj.size)}</td>
            <td>{obj.lastModified ? new Date(obj.lastModified).toLocaleString() : "—"}</td>
            <td>
              <a href={`/tmp/bucket/download?key=${encodeURIComponent(obj.key)}`} download>
                Download
              </a>
              <button onclick={() => deleteObject(obj.key)}>Delete</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</section>

<style>
  section {
    margin-top: 1.5rem;
  }
  table {
    border-collapse: collapse;
    margin-top: 1rem;
  }
  th,
  td {
    border: 1px solid #ccc;
    padding: 0.25rem 0.5rem;
    text-align: left;
  }
</style>
