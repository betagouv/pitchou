DO $$
DECLARE
    code_acces text := 'abyssin';
    numero_demarche int := 88444;
    dossier_ids int[];
    groupe_id uuid;
    cap_dossier uuid;
    personne_id int;
BEGIN

    -- Instructeurice
    INSERT INTO personne (email, "code_accès")
    VALUES ('alexandre@example.net', code_acces)
    RETURNING id INTO personne_id;

    -- Dossiers
    WITH dossiers_inseres AS (
        INSERT INTO dossier (nom, "numéro_démarche", "date_dépôt")
        SELECT nom, numero_demarche, now()
        FROM (VALUES
            ('Parc photovoltaïque à Anglet'),
            ('Recherche scientifique sur les chats'),
            ('Projet hydraulique'),
            ('Projet de carrières à Abyssin')
        ) AS v(nom)
        RETURNING id
    )


    SELECT array_agg(id) INTO dossier_ids
    FROM dossiers_inseres;

    -- Groupe Instructeurice
    INSERT INTO groupe_instructeurs (nom, "numéro_démarche")
    VALUES ('DREAL Pays Basque', numero_demarche)
    RETURNING id INTO groupe_id;

    INSERT INTO cap_dossier (personne_cap)
    VALUES (code_acces)
    RETURNING cap INTO cap_dossier;

    INSERT INTO "arête_groupe_instructeurs__dossier" (dossier, groupe_instructeurs)
    SELECT unnest(dossier_ids), groupe_id;

    INSERT INTO "arête_cap_dossier__groupe_instructeurs"
    VALUES (cap_dossier, groupe_id);

    -- Personne suit dossier
    INSERT INTO "arête_personne_suit_dossier" (personne, dossier)
    SELECT personne_id, unnest(dossier_ids);
END $$;
