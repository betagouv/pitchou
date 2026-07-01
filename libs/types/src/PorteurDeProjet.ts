export type PorteurDeProjetPersonneMorale = {
  type: "personne morale";
  siret: string | null;
  adresse: string | null;
  nom_representant: string | null;
  prenom_representant: string | null;
  qualite_representant: string | null;
  telephone: string | null;
  email: string | null;
};

export type PorteurDeProjetPersonnePhysique = {
  type: "personne physique";
  nom: string | null;
  prenom: string | null;
  qualification: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
};

export type PorteurDeProjet = PorteurDeProjetPersonneMorale | PorteurDeProjetPersonnePhysique;
