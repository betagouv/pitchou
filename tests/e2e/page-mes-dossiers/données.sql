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
        SELECT nom, numero_demarche, "date_dépôt"
        FROM (VALUES
            ('Parc photovoltaïque à Anglet', date '2026-02-14'),
            ('Recherche scientifique sur les chats', date '2026-01-14'),
            ('Projet hydraulique', date '2025-02-18'),
            ('Projet de carrières à Abyssin', date '2026-02-18'),
            ('Dossier que je ne suis pas', now())
        ) AS v(nom, "date_dépôt")
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

    -- L'instructeurice ne suit que 4 des 5 dossiers
    INSERT INTO "arête_personne_suit_dossier" (personne, dossier)
    SELECT personne_id, unnest(dossier_ids[1:4]);

    -- Notification : Seuls les 2 premiers dossiers ont une notification non vue.
    INSERT INTO "notification" (personne, dossier, vue, updated_at)
    VALUES (personne_id, dossier_ids[1], 'false', date '2026-02-15'),
    (personne_id, dossier_ids[2], 'false', date '2026-02-17');

    -- l'insert ci-dessous est nécessaire pour que l'instructeurice ait la bonne cap pour accéder aux notifications
    INSERT INTO "cap_évènement_métrique" (personne_cap)
    VALUES (code_acces);
END $$;
