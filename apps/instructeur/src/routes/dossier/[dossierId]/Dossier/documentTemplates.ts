export function documentTemplateKey(template: File): string {
  return `${template.name}:${template.size}:${template.lastModified}`;
}

export function mergeDocumentTemplates(existing: File[], files: FileList | null) {
  const selected = Array.from(files ?? []);
  const valid = selected.filter((file) => file.name.toLowerCase().endsWith(".odt"));
  const keys = new Set(existing.map(documentTemplateKey));
  return {
    templates: [...existing, ...valid.filter((file) => !keys.has(documentTemplateKey(file)))],
    error:
      valid.length === selected.length
        ? undefined
        : "Seuls les modèles au format ODT peuvent être ajoutés.",
  };
}
