export function projectForSample(sample) {
  const id = sample.identity.projetId ?? sample.identity.sourceId;
  const { name, ...fields } = sample.proposal.dossier;
  return {
    formatVersion: 2,
    identity: {
      sourceInstance: "onagre-national",
      sourceTable: "projet",
      sourceId: id,
      key: `onagre-national:projet:${id}`,
    },
    proposal: { name: name ?? "Synthetic project" },
    demandes: [
      {
        ...sample,
        identity: { ...sample.identity, projetId: id },
        label: "Synthetic demande",
        proposal: { ...sample.proposal, dossier: fields, records: sample.proposal.records ?? [] },
      },
    ],
  };
}
