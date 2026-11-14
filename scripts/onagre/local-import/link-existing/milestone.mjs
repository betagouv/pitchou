const day = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}/u.test(value) ? value.slice(0, 10) : null;

function sourceHas(demande, milestone) {
  if (milestone.kind === "deposit")
    return (
      day(demande.proposal.dossier.ddep_depot_date ?? demande.proposal.dossier.depot_date) ===
      milestone.date
    );
  return (demande.proposal.records ?? []).some((r) =>
    milestone.kind === "signature"
      ? r.table === "decision_administrative" && day(r.values.signature_date) === milestone.date
      : r.table === "avis_expert" &&
        r.values.expert === milestone.expert &&
        day(r.values.avis_date) === milestone.date,
  );
}

/** A reviewed milestone must distinguish this demande from every known sibling. */
export function assertScopedMilestone(project, demande, current, evidence, milestone) {
  if (
    !milestone ||
    !["deposit", "signature", "opinion"].includes(milestone.kind) ||
    day(milestone.date) !== milestone.date ||
    milestone.date <= "1900-01-01" ||
    (milestone.kind === "opinion" && !milestone.expert)
  )
    throw new Error("An exact reviewed milestone is required");
  const matches = project.demandes.filter((d) => sourceHas(d, milestone));
  if (matches.length !== 1 || matches[0].identity.key !== demande.identity.key)
    throw new Error("The reviewed milestone must identify exactly this source demande");
  const targetMatches =
    milestone.kind === "deposit"
      ? day(current.ddep_depot_date ?? current.depot_date) === milestone.date
      : milestone.kind === "signature"
        ? (evidence.decision_administrative ?? []).some(
            (r) => day(r.signature_date) === milestone.date,
          )
        : (evidence.avis_expert ?? []).some(
            (r) => r.expert === milestone.expert && day(r.avis_date) === milestone.date,
          );
  const quoted = milestone.targetQuote === undefined ? false : matchesQuote(current, milestone);
  if (!targetMatches && !quoted)
    throw new Error("The reviewed milestone must be present in the DN record");
}

function matchesQuote(current, milestone) {
  const quote = milestone.targetQuote;
  const [year, month, date] = milestone.date.split("-");
  const dateForms = [
    milestone.date,
    `${date}/${month}/${year}`,
    `${date}/${month}/${year.slice(-2)}`,
  ];
  const role =
    milestone.kind === "deposit"
      ? /dépôt/iu
      : milestone.kind === "signature"
        ? /sign[ée]|arrêté/iu
        : /avis/iu;
  if (
    typeof quote !== "string" ||
    quote.length < 30 ||
    !current.free_comment?.includes(quote) ||
    !dateForms.some((value) => quote.includes(value)) ||
    !role.test(quote) ||
    (milestone.kind === "opinion" && !quote.includes(milestone.expert))
  )
    throw new Error("The quoted DN milestone must retain its exact date, role and source text");
  return true;
}
