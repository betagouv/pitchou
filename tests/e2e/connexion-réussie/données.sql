DO $$
DECLARE
    code_acces text := 'abyssin';
    numero_demarche int := 88444;
    dossier_id int;
    groupe_id uuid;
    cap_dossier uuid;
BEGIN
    INSERT INTO personne (email, "code_accès")
    VALUES ('alexandre@example.net', code_acces);

    INSERT INTO dossier (nom, "numéro_démarche", "date_dépôt")
    VALUES ('Parc photovoltaïque à Anglet', numero_demarche, now())
    RETURNING id INTO dossier_id;

    INSERT INTO groupe_instructeurs (nom, "numéro_démarche")
    VALUES ('DREAL Pays Basque', numero_demarche)
    RETURNING id INTO groupe_id;

    INSERT INTO cap_dossier (personne_cap)
    VALUES (code_acces)
    RETURNING cap INTO cap_dossier;

    INSERT INTO "arête_groupe_instructeurs__dossier"
    VALUES (dossier_id, groupe_id);

    INSERT INTO "arête_cap_dossier__groupe_instructeurs"
    VALUES (cap_dossier, groupe_id);
END $$;
