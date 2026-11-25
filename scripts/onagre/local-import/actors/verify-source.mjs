import assert from "node:assert/strict";

function fresh(sample, suffix) {
  const copy = structuredClone(sample);
  copy.identity.sourceId += suffix;
  copy.identity.key += suffix;
  copy.proposal.dossier.onagre_demande_identifier += suffix;
  const id = copy.identity.sourceId;
  copy.proposal.contacts = [
    {
      sourceKey: `onagre-national:projet:${id}:applicant-contact`,
      values: { ...copy.proposal.contacts[0].values, last_name: "Former contact" },
    },
  ];
  return copy;
}

function withSource(sample, typepersonne, projet) {
  const copy = structuredClone(sample);
  copy.source = {
    rows: {
      projet: [
        {
          projetid: copy.identity.sourceId,
          petitionnairesid: "1",
          prenompersonne: "Lou",
          nompersonne: "Robin",
          adressepetitionnaire: "2 rue des Ormes",
          telephonepetitionnaire: "",
          telephoneportablepetitionnaire: "0607080910",
          adressemailpetitionnaire: "",
          adressemailchefprojet: "chef@example.test",
          nomcoordinateur: "M. Sacha MARTIN",
          ...projet,
        },
      ],
      petitionnaires: [{ petitionnairesid: "1", categorieid: "1" }],
      categorie: [{ categorieid: "1", typepersonne }],
    },
  };
  return copy;
}

async function acteurs(client, dossierId) {
  return (
    await client.query(
      `SELECT a.involvement, p.first_names, p.last_name, p.email, p.address, p.phone, p.role
      FROM dossier_acteur a JOIN personne_physique p ON p.id=a.personne_physique
      WHERE a.dossier=$1 ORDER BY a.involvement, p.last_name`,
      [dossierId],
    )
  ).rows;
}

async function verifyMorale(client, sample, run) {
  const legacy = fresh(sample, "7");
  const before = await run(legacy);
  assert.deepEqual(
    (await acteurs(client, before.dossierId)).map((row) => row.last_name),
    ["Former contact"],
  );
  const formerId = before.outcomes.find((x) => x.table === "personne_physique").targetId;

  const morale = withSource(legacy, "Personne Morale", {});
  const imported = await run(morale);
  assert.equal(imported.outcomes.filter((x) => x.status === "removed").length, 2);
  assert.equal(
    (await client.query("SELECT 1 FROM personne_physique WHERE id=$1", [formerId])).rows.length,
    0,
  );
  assert.deepEqual(await acteurs(client, imported.dossierId), [
    {
      involvement: "beneficiaire",
      first_names: "Lou",
      last_name: "Robin",
      email: null,
      address: "2 rue des Ormes",
      phone: "0607080910",
      role: null,
    },
    {
      involvement: "personne_contact",
      first_names: "Sacha",
      last_name: "MARTIN",
      email: "chef@example.test",
      address: null,
      phone: null,
      role: null,
    },
  ]);
  assert.equal(imported.retainedRemovedRecords.length, 0);
  assert((await run(morale)).outcomes.every((x) => x.status === "unchanged"));
}

async function verifyPhysique(client, sample, run) {
  const physique = withSource(fresh(sample, "8"), "Personne Physique", {
    adressemailchefprojet: "lou.robin@example.test",
    nomcoordinateur: "",
  });
  const porteur = await run(physique);
  assert.deepEqual(await acteurs(client, porteur.dossierId), []);
  assert.deepEqual(
    (
      await client.query(
        `SELECT p.first_names, p.last_name, p.email, p.phone, p.address, p.role FROM dossier d
        JOIN porteur_de_projet pp ON pp.id=d.porteur_de_projet
        JOIN personne_physique p ON p.id=pp.personne_physique WHERE d.id=$1`,
        [porteur.dossierId],
      )
    ).rows,
    [
      {
        first_names: "Lou",
        last_name: "Robin",
        email: "lou.robin@example.test",
        phone: "0607080910",
        address: "2 rue des Ormes",
        role: null,
      },
    ],
  );
  assert((await run(physique)).outcomes.every((x) => x.status === "unchanged"));
}

async function verifyProtection(client, sample, run) {
  const shared = fresh(sample, "6");
  const sharedRun = await run(shared);
  await client.query("SAVEPOINT former_contact_role_check");
  try {
    await client.query(
      "INSERT INTO dossier_acteur (dossier,personne_physique,involvement) VALUES ($1,$2,'mandataire')",
      [
        sharedRun.dossierId,
        sharedRun.outcomes.find((x) => x.table === "personne_physique").targetId,
      ],
    );
    await assert.rejects(() => run(withSource(shared, "Personne Morale", {})), /another role/u);
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT former_contact_role_check");
  }

  const edited = fresh(sample, "9");
  const editedRun = await run(edited);
  const editedPerson = editedRun.outcomes.find((x) => x.table === "personne_physique").targetId;
  await client.query("UPDATE personne_physique SET phone='0000000000' WHERE id=$1", [editedPerson]);
  await client.query("SAVEPOINT former_contact_check");
  try {
    await assert.rejects(() => run(withSource(edited, "Personne Morale", {})), /Former contact/u);
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT former_contact_check");
  }
}

/** Checks the owner's pétitionnaire decision against PostgreSQL; the caller rolls back. */
export async function verifySourceActors(client, sample, run) {
  await verifyMorale(client, sample, run);
  await verifyPhysique(client, sample, run);
  await verifyProtection(client, sample, run);
}
