SET code_accès = 'abyssin';
SET numéro_démarche = 88444;

SET personneId = insert into personne (email, code_accès) values ('alexandre@example.net', code_accès) RETURNING id;
SET dossierId = insert into dossier (nom, numéro_démarche) values ('Parc photovoltaïque à Anglet', numéro_démarche) RETURNING id;
SET groupeInstructeursId = insert into groupe_instructeurs (nom, numéro_démarche) values ('DREAL Pays Basque', numéro_démarche) RETURNING id;
set capDossier = insert into cap_dossier (personne_cap) values (code_accès) RETURNING cap;


insert into arête_groupe_instructeurs__dossier (dossier, groupe_instructeurs) values (dossierId, groupeInstructeursId)
insert into arête_cap_dossier__groupe_instructeurs (cap_dossier, groupe_instructeurs) values (capDossier, groupeInstructeursId)