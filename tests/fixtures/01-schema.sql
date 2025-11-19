--
-- PostgreSQL database dump
--

-- Dumped from database version 15.7 (Debian 15.7-1.pgdg120+1)
-- Dumped by pg_dump version 15.7 (Debian 15.7-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."évènement_phase_dossier" DROP CONSTRAINT IF EXISTS "évènement_phase_dossier_dossier_foreign";
ALTER TABLE IF EXISTS ONLY public."évènement_phase_dossier" DROP CONSTRAINT IF EXISTS "évènement_phase_dossier_cause_personne_foreign";
ALTER TABLE IF EXISTS ONLY public.prescription DROP CONSTRAINT IF EXISTS "prescription_décision_administrative_foreign";
ALTER TABLE IF EXISTS ONLY public.message DROP CONSTRAINT IF EXISTS message_dossier_foreign;
ALTER TABLE IF EXISTS ONLY public."décision_administrative" DROP CONSTRAINT IF EXISTS "décision_administrative_fichier_foreign";
ALTER TABLE IF EXISTS ONLY public."décision_administrative" DROP CONSTRAINT IF EXISTS "décision_administrative_dossier_foreign";
ALTER TABLE IF EXISTS ONLY public.dossier DROP CONSTRAINT IF EXISTS "dossier_espèces_impactées_foreign";
ALTER TABLE IF EXISTS ONLY public.dossier DROP CONSTRAINT IF EXISTS "dossier_déposant_foreign";
ALTER TABLE IF EXISTS ONLY public.dossier DROP CONSTRAINT IF EXISTS dossier_demandeur_personne_physique_foreign;
ALTER TABLE IF EXISTS ONLY public.dossier DROP CONSTRAINT IF EXISTS dossier_demandeur_personne_morale_foreign;
ALTER TABLE IF EXISTS ONLY public."contrôle" DROP CONSTRAINT IF EXISTS "contrôle_prescription_foreign";
ALTER TABLE IF EXISTS ONLY public.cap_dossier DROP CONSTRAINT IF EXISTS cap_dossier_personne_cap_foreign;
ALTER TABLE IF EXISTS ONLY public.avis_expert DROP CONSTRAINT IF EXISTS avis_expert_saisine_fichier_foreign;
ALTER TABLE IF EXISTS ONLY public.avis_expert DROP CONSTRAINT IF EXISTS avis_expert_dossier_foreign;
ALTER TABLE IF EXISTS ONLY public.avis_expert DROP CONSTRAINT IF EXISTS avis_expert_avis_fichier_foreign;
ALTER TABLE IF EXISTS ONLY public."arête_personne_suit_dossier" DROP CONSTRAINT IF EXISTS "arête_personne_suit_dossier_personne_foreign";
ALTER TABLE IF EXISTS ONLY public."arête_personne_suit_dossier" DROP CONSTRAINT IF EXISTS "arête_personne_suit_dossier_dossier_foreign";
ALTER TABLE IF EXISTS ONLY public."arête_personne__cap_écriture_annotation" DROP CONSTRAINT IF EXISTS "arête_personne__cap_écriture_annotation_écriture_annotation_";
ALTER TABLE IF EXISTS ONLY public."arête_personne__cap_écriture_annotation" DROP CONSTRAINT IF EXISTS "arête_personne__cap_écriture_annotation_personne_cap_foreign";
ALTER TABLE IF EXISTS ONLY public."arête_groupe_instructeurs__dossier" DROP CONSTRAINT IF EXISTS "arête_groupe_instructeurs__dossier_groupe_instructeurs_foreign";
ALTER TABLE IF EXISTS ONLY public."arête_groupe_instructeurs__dossier" DROP CONSTRAINT IF EXISTS "arête_groupe_instructeurs__dossier_dossier_foreign";
ALTER TABLE IF EXISTS ONLY public."arête_cap_dossier__groupe_instructeurs" DROP CONSTRAINT IF EXISTS "arête_cap_dossier__groupe_instructeurs_groupe_instructeurs_for";
ALTER TABLE IF EXISTS ONLY public."arête_cap_dossier__groupe_instructeurs" DROP CONSTRAINT IF EXISTS "arête_cap_dossier__groupe_instructeurs_cap_dossier_foreign";
DROP INDEX IF EXISTS public."évènement_phase_dossier_dossier_index";
DROP INDEX IF EXISTS public."prescription_décision_administrative_index";
DROP INDEX IF EXISTS public.message_dossier_index;
DROP INDEX IF EXISTS public."espèces_impactées_ds_createdat_index";
DROP INDEX IF EXISTS public."espèces_impactées_ds_checksum_index";
DROP INDEX IF EXISTS public."décision_administrative_numéro_index";
DROP INDEX IF EXISTS public."décision_administrative_dossier_index";
DROP INDEX IF EXISTS public."dossier_déposant_index";
DROP INDEX IF EXISTS public.dossier_demandeur_personne_physique_index;
DROP INDEX IF EXISTS public.dossier_demandeur_personne_morale_index;
DROP INDEX IF EXISTS public."contrôle_prescription_index";
DROP INDEX IF EXISTS public.avis_expert_dossier_index;
DROP INDEX IF EXISTS public."arête_personne_suit_dossier_personne_index";
DROP INDEX IF EXISTS public."arête_personne_suit_dossier_dossier_index";
DROP INDEX IF EXISTS public."arête_cap_dossier__groupe_instructeurs_cap_dossier_index";
ALTER TABLE IF EXISTS ONLY public."évènement_phase_dossier" DROP CONSTRAINT IF EXISTS "évènement_phase_dossier_dossier_phase_horodatage_unique";
ALTER TABLE IF EXISTS ONLY public."résultat_synchronisation_DS_88444" DROP CONSTRAINT IF EXISTS "résultat_synchronisation_ds_88444_succès_unique";
ALTER TABLE IF EXISTS ONLY public.prescription DROP CONSTRAINT IF EXISTS prescription_pkey;
ALTER TABLE IF EXISTS ONLY public.personne DROP CONSTRAINT IF EXISTS personne_pkey;
ALTER TABLE IF EXISTS ONLY public.personne DROP CONSTRAINT IF EXISTS personne_email_unique;
ALTER TABLE IF EXISTS ONLY public.personne DROP CONSTRAINT IF EXISTS "personne_code_accès_unique";
ALTER TABLE IF EXISTS ONLY public.message DROP CONSTRAINT IF EXISTS message_pkey;
ALTER TABLE IF EXISTS ONLY public.message DROP CONSTRAINT IF EXISTS "message_id_démarches_simplifiées_unique";
ALTER TABLE IF EXISTS ONLY public.knex_migrations DROP CONSTRAINT IF EXISTS knex_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.knex_migrations_lock DROP CONSTRAINT IF EXISTS knex_migrations_lock_pkey;
ALTER TABLE IF EXISTS ONLY public.groupe_instructeurs DROP CONSTRAINT IF EXISTS groupe_instructeurs_pkey;
ALTER TABLE IF EXISTS ONLY public.groupe_instructeurs DROP CONSTRAINT IF EXISTS groupe_instructeurs_nom_unique;
ALTER TABLE IF EXISTS ONLY public.fichier DROP CONSTRAINT IF EXISTS "espèces_impactées_pkey";
ALTER TABLE IF EXISTS ONLY public.entreprise DROP CONSTRAINT IF EXISTS entreprise_pkey;
ALTER TABLE IF EXISTS ONLY public."décision_administrative" DROP CONSTRAINT IF EXISTS "décision_administrative_pkey";
ALTER TABLE IF EXISTS ONLY public."décision_administrative" DROP CONSTRAINT IF EXISTS "décision_administrative_dossier_numéro_unique";
ALTER TABLE IF EXISTS ONLY public.dossier DROP CONSTRAINT IF EXISTS dossier_pkey;
ALTER TABLE IF EXISTS ONLY public.dossier DROP CONSTRAINT IF EXISTS "dossier_number_demarches_simplifiées_unique";
ALTER TABLE IF EXISTS ONLY public.dossier DROP CONSTRAINT IF EXISTS "dossier_id_demarches_simplifiées_unique";
ALTER TABLE IF EXISTS ONLY public."contrôle" DROP CONSTRAINT IF EXISTS "contrôle_pkey";
ALTER TABLE IF EXISTS ONLY public."cap_écriture_annotation" DROP CONSTRAINT IF EXISTS "cap_écriture_annotation_pkey";
ALTER TABLE IF EXISTS ONLY public."cap_écriture_annotation" DROP CONSTRAINT IF EXISTS "cap_écriture_annotation_instructeur_id_unique";
ALTER TABLE IF EXISTS ONLY public.cap_dossier DROP CONSTRAINT IF EXISTS cap_dossier_pkey;
ALTER TABLE IF EXISTS ONLY public.cap_dossier DROP CONSTRAINT IF EXISTS cap_dossier_personne_cap_unique;
ALTER TABLE IF EXISTS ONLY public.avis_expert DROP CONSTRAINT IF EXISTS avis_expert_pkey;
ALTER TABLE IF EXISTS ONLY public."arête_personne_suit_dossier" DROP CONSTRAINT IF EXISTS "arête_personne_suit_dossier_dossier_personne_unique";
ALTER TABLE IF EXISTS ONLY public."arête_personne__cap_écriture_annotation" DROP CONSTRAINT IF EXISTS "arête_personne__cap_écriture_annotation_personne_cap_unique";
ALTER TABLE IF EXISTS ONLY public."arête_groupe_instructeurs__dossier" DROP CONSTRAINT IF EXISTS "arête_groupe_instructeurs__dossier_dossier_unique";
ALTER TABLE IF EXISTS public.personne ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.knex_migrations_lock ALTER COLUMN index DROP DEFAULT;
ALTER TABLE IF EXISTS public.knex_migrations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.dossier ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public."évènement_phase_dossier";
DROP TABLE IF EXISTS public."résultat_synchronisation_DS_88444";
DROP TABLE IF EXISTS public.prescription;
DROP SEQUENCE IF EXISTS public.personne_id_seq;
DROP TABLE IF EXISTS public.personne;
DROP TABLE IF EXISTS public.message;
DROP SEQUENCE IF EXISTS public.knex_migrations_lock_index_seq;
DROP TABLE IF EXISTS public.knex_migrations_lock;
DROP SEQUENCE IF EXISTS public.knex_migrations_id_seq;
DROP TABLE IF EXISTS public.knex_migrations;
DROP TABLE IF EXISTS public.groupe_instructeurs;
DROP TABLE IF EXISTS public.fichier;
DROP TABLE IF EXISTS public.entreprise;
DROP TABLE IF EXISTS public."décision_administrative";
DROP SEQUENCE IF EXISTS public.dossier_id_seq;
DROP TABLE IF EXISTS public.dossier;
DROP TABLE IF EXISTS public."contrôle";
DROP TABLE IF EXISTS public."cap_écriture_annotation";
DROP TABLE IF EXISTS public.cap_dossier;
DROP TABLE IF EXISTS public.avis_expert;
DROP TABLE IF EXISTS public."arête_personne_suit_dossier";
DROP TABLE IF EXISTS public."arête_personne__cap_écriture_annotation";
DROP TABLE IF EXISTS public."arête_groupe_instructeurs__dossier";
DROP TABLE IF EXISTS public."arête_cap_dossier__groupe_instructeurs";
DROP TYPE IF EXISTS public."TypeDossier";
--
-- Name: TypeDossier; Type: TYPE; Schema: public; Owner: dev
--

CREATE TYPE public."TypeDossier" AS ENUM (
    'Hirondelle',
    'Cigogne'
);


ALTER TYPE public."TypeDossier" OWNER TO dev;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: arête_cap_dossier__groupe_instructeurs; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."arête_cap_dossier__groupe_instructeurs" (
    cap_dossier uuid NOT NULL,
    groupe_instructeurs uuid NOT NULL
);


ALTER TABLE public."arête_cap_dossier__groupe_instructeurs" OWNER TO dev;

--
-- Name: arête_groupe_instructeurs__dossier; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."arête_groupe_instructeurs__dossier" (
    dossier integer NOT NULL,
    groupe_instructeurs uuid NOT NULL
);


ALTER TABLE public."arête_groupe_instructeurs__dossier" OWNER TO dev;

--
-- Name: arête_personne__cap_écriture_annotation; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."arête_personne__cap_écriture_annotation" (
    personne_cap character varying(255),
    "écriture_annotation_cap" uuid
);


ALTER TABLE public."arête_personne__cap_écriture_annotation" OWNER TO dev;

--
-- Name: arête_personne_suit_dossier; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."arête_personne_suit_dossier" (
    personne integer NOT NULL,
    dossier integer NOT NULL
);


ALTER TABLE public."arête_personne_suit_dossier" OWNER TO dev;

--
-- Name: avis_expert; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public.avis_expert (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dossier integer NOT NULL,
    expert character varying(255),
    date_saisine date,
    saisine_fichier uuid,
    avis character varying(255),
    date_avis date,
    avis_fichier uuid
);


ALTER TABLE public.avis_expert OWNER TO dev;

--
-- Name: COLUMN avis_expert.expert; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.avis_expert.expert IS 'Instance consultée pour avis sur la dérogation (ex. : CSRPN, CNPN, autre autorité compétente).';


--
-- Name: COLUMN avis_expert.date_saisine; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.avis_expert.date_saisine IS 'Date à laquelle l''expert a été officiellement saisi pour avis.';


--
-- Name: COLUMN avis_expert.saisine_fichier; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.avis_expert.saisine_fichier IS 'Fichier transmis lors de la saisine de l''expert.';


--
-- Name: COLUMN avis_expert.avis; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.avis_expert.avis IS 'Nature de l''avis émis par l''expert (ex. : Favorable, Favorable sous conditions, Défavorable, Non renseigné).';


--
-- Name: COLUMN avis_expert.date_avis; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.avis_expert.date_avis IS 'Date de formulation ou de réception de l''avis de l''expert.';


--
-- Name: COLUMN avis_expert.avis_fichier; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.avis_expert.avis_fichier IS 'Fichier contenant l''avis formel de l''expert.';


--
-- Name: cap_dossier; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public.cap_dossier (
    cap uuid DEFAULT gen_random_uuid() NOT NULL,
    personne_cap character varying(255) NOT NULL
);


ALTER TABLE public.cap_dossier OWNER TO dev;

--
-- Name: cap_écriture_annotation; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."cap_écriture_annotation" (
    cap uuid DEFAULT gen_random_uuid() NOT NULL,
    instructeur_id character varying(255) NOT NULL
);


ALTER TABLE public."cap_écriture_annotation" OWNER TO dev;

--
-- Name: COLUMN "cap_écriture_annotation".instructeur_id; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."cap_écriture_annotation".instructeur_id IS 'Identifiant de l''instructeur.rice dans Démarches Simplifiées. Utile pour faire référence à l''instructeur.rice dans les appels API';


--
-- Name: contrôle; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."contrôle" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prescription uuid NOT NULL,
    "date_contrôle" timestamp(0) with time zone,
    "résultat" character varying(255),
    commentaire text,
    "type_action_suite_contrôle" character varying(255),
    "date_action_suite_contrôle" date,
    "date_prochaine_échéance" date
);


ALTER TABLE public."contrôle" OWNER TO dev;

--
-- Name: COLUMN "contrôle".prescription; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."contrôle".prescription IS 'Référence vers la prescription associée à ce contrôle. Une prescription peut avoir plusieurs contrôles pour assurer le suivi de sa mise en œuvre.';


--
-- Name: COLUMN "contrôle"."date_contrôle"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."contrôle"."date_contrôle" IS 'Date et heure précise à laquelle le contrôle a été effectué. Permet de tracer la chronologie des vérifications et de planifier les contrôles futurs.';


--
-- Name: COLUMN "contrôle"."résultat"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."contrôle"."résultat" IS 'Résultat du contrôle effectué. Pour le moment, c''est une chaîne libre. À terme, les valeurs pourront être standardisées (ex: Conforme, Non conforme, Conforme avec réserves, etc.) pour faciliter l''analyse et le reporting.';


--
-- Name: COLUMN "contrôle".commentaire; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."contrôle".commentaire IS 'Commentaires détaillés de l''inspecteur sur le contrôle effectué. Peut inclure des observations sur l''état de mise en œuvre, des difficultés rencontrées, des recommandations, etc.';


--
-- Name: COLUMN "contrôle"."type_action_suite_contrôle"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."contrôle"."type_action_suite_contrôle" IS 'Type d''action à entreprendre suite au contrôle. Pour le moment, c''est une chaîne libre. Exemples : email, courrier, etc.';


--
-- Name: COLUMN "contrôle"."date_action_suite_contrôle"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."contrôle"."date_action_suite_contrôle" IS 'Date à laquelle l''action suite au contrôle a été effectuée. Elle est souvent égale à la date_contrôle, mais peut être différente si l''instructeur.rice ne fait pas les suites dans la foulée du contrôle';


--
-- Name: COLUMN "contrôle"."date_prochaine_échéance"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."contrôle"."date_prochaine_échéance" IS 'Date de la prochaine échéance de contrôle programmée. Permet de planifier le suivi de la prescription et de prévoir un autre contrôle.';


--
-- Name: dossier; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public.dossier (
    id integer NOT NULL,
    "id_demarches_simplifiées" character varying(255),
    "date_dépôt" timestamp with time zone NOT NULL,
    "départements" json,
    communes json,
    "déposant" integer,
    demandeur_personne_physique integer,
    demandeur_personne_morale character varying(14),
    "régions" json,
    nom character varying(1023),
    "number_demarches_simplifiées" bigint,
    "ddep_nécessaire" character varying(255),
    enjeu_politique boolean,
    commentaire_libre text,
    "historique_date_envoi_dernière_contribution" date,
    historique_identifiant_demande_onagre character varying(255),
    date_debut_consultation_public date,
    "enjeu_écologique" boolean,
    "rattaché_au_régime_ae" boolean,
    prochaine_action_attendue_par character varying(255),
    "activité_principale" character varying(255),
    "espèces_impactées" uuid,
    description text,
    "date_début_intervention" date,
    date_fin_intervention date,
    "durée_intervention" real,
    scientifique_type_demande json,
    scientifique_description_protocole_suivi text,
    scientifique_mode_capture json,
    "scientifique_modalités_source_lumineuses" text,
    "scientifique_modalités_marquage" text,
    "scientifique_modalités_transport" text,
    "scientifique_périmètre_intervention" text,
    scientifique_intervenants json,
    "scientifique_précisions_autres_intervenants" text,
    justification_absence_autre_solution_satisfaisante text,
    "motif_dérogation" character varying(255),
    "justification_motif_dérogation" text,
    "mesures_erc_prévues" boolean,
    "scientifique_bilan_antérieur" boolean,
    "scientifique_finalité_demande" json,
    "nombre_nids_détruits_dossier_oiseau_simple" integer,
    "nombre_nids_compensés_dossier_oiseau_simple" integer,
    type public."TypeDossier",
    "numéro_démarche" integer NOT NULL,
    etat_des_lieux_ecologique_complet_realise boolean,
    presence_especes_dans_aire_influence boolean,
    risque_malgre_mesures_erc boolean,
    date_fin_consultation_public timestamp with time zone
);


ALTER TABLE public.dossier OWNER TO dev;

--
-- Name: COLUMN dossier."id_demarches_simplifiées"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."id_demarches_simplifiées" IS 'Identifiant unique du dossier dans la plateforme Démarches Simplifiées. Utile uniquement pour certaines mutations de l''API GraphQL. Utiliser plutôt le number_demarches_simplifiées';


--
-- Name: COLUMN dossier."date_dépôt"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."date_dépôt" IS 'Date à laquelle la demande de dérogation Espèce Protégée a été reçue par les instructeur.i.ces.';


--
-- Name: COLUMN dossier."départements"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."départements" IS 'Liste des départements concernés par le projet';


--
-- Name: COLUMN dossier.communes; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.communes IS 'Liste des communes concernées par le projet';


--
-- Name: COLUMN dossier."déposant"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."déposant" IS 'Le déposant est la personne qui dépose le dossier sur DS. Dans certaines situations, cette personne est différente du demandeur (personne morale ou physique qui demande la dérogation), par exemple, si un bureau d''étude mandaté par une personne morale dépose le dossier. Le déposant n''est pas forcément représentant interne (point de contact principale) du demandeur. Dans la nomenclature DS, ce que nous appelons "déposant" se trouve dans la propriété "demandeur" (qui est différent de notre "demandeur")';


--
-- Name: COLUMN dossier.demandeur_personne_physique; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.demandeur_personne_physique IS 'Si le demandeur est une personne physique, ce champ est non nul';


--
-- Name: COLUMN dossier.demandeur_personne_morale; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.demandeur_personne_morale IS 'Si le demandeur est une personne morale, ce champ est non nul';


--
-- Name: COLUMN dossier."régions"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."régions" IS 'Liste des régions concernées par le projet';


--
-- Name: COLUMN dossier.nom; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.nom IS 'Nom de la demande de dérogation espèces protégées';


--
-- Name: COLUMN dossier."number_demarches_simplifiées"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."number_demarches_simplifiées" IS 'Numéro du dossier dans Démarches Simplifiées';


--
-- Name: COLUMN dossier."ddep_nécessaire"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."ddep_nécessaire" IS 'Indique si une demande de dérogation est nécessaire pour ce dossier (Oui, Non, à déterminer).';


--
-- Name: COLUMN dossier.enjeu_politique; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.enjeu_politique IS 'Indique si le dossier présente un enjeu politique';


--
-- Name: COLUMN dossier.commentaire_libre; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.commentaire_libre IS 'Commentaires de l''instructeur.rice sur le dossier';


--
-- Name: COLUMN dossier."historique_date_envoi_dernière_contribution"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."historique_date_envoi_dernière_contribution" IS 'Date d''envoi de la dernière contribution';


--
-- Name: COLUMN dossier.historique_identifiant_demande_onagre; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.historique_identifiant_demande_onagre IS 'Identifiant de la demande dans ONAGRE';


--
-- Name: COLUMN dossier.date_debut_consultation_public; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.date_debut_consultation_public IS 'Date de la consultation publique';


--
-- Name: COLUMN dossier."enjeu_écologique"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."enjeu_écologique" IS 'Indique si le dossier présente un enjeu écologique';


--
-- Name: COLUMN dossier."rattaché_au_régime_ae"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."rattaché_au_régime_ae" IS 'Indique si le dossier est rattaché au régime d''Autorisation Environnementale';


--
-- Name: COLUMN dossier.prochaine_action_attendue_par; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.prochaine_action_attendue_par IS 'Indique qui doit effectuer la prochaine action (Instructeur, CNPN/CSRPN, Consultation du public, Pétitionnaire, Autre administration...)';


--
-- Name: COLUMN dossier."activité_principale"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."activité_principale" IS 'Catégorie normalisée décrivant le secteur ou le type d''activité à l''origine de la demande de dérogation relative aux espèces protégées. Les valeurs possibles couvrent différents domaines (production d''énergie renouvelable, infrastructures de transport, carrières, urbanisation, gestion de l''eau, restauration écologique, etc.) et permettent de classer les dossiers selon la nature de l''intervention.';


--
-- Name: COLUMN dossier."espèces_impactées"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."espèces_impactées" IS 'Référence vers le fichier des espèces impactées';


--
-- Name: COLUMN dossier.description; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.description IS 'Description synthétique du projet';


--
-- Name: COLUMN dossier."date_début_intervention"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."date_début_intervention" IS 'Date de début de l''intervention';


--
-- Name: COLUMN dossier.date_fin_intervention; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.date_fin_intervention IS 'Date de fin de l''intervention';


--
-- Name: COLUMN dossier."durée_intervention"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."durée_intervention" IS 'Peut être différente de (date_fin_intervention - date_début_intervention) dans le cas des dérogations pluri-annuelles avec une petite période d''intervention annuelle';


--
-- Name: COLUMN dossier.scientifique_type_demande; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.scientifique_type_demande IS 'Dans le contexte d''un dossier dont l''activité principale est la recherche scientifique. Ce champ correspond à la liste des opérations envisagées dans le cadre de la demande de dérogation espèces protégées, choisies parmi des catégories prédéfinies (par ex. capture et relâcher immédiat sur place avec ou sans marquage, prélèvement de matériel biologique, autres cas spécifiques). Plusieurs types peuvent être sélectionnés pour une même demande.';


--
-- Name: COLUMN dossier.scientifique_description_protocole_suivi; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.scientifique_description_protocole_suivi IS 'Dans le contexte d''un dossier dont l''activité principale est la recherche scientifique. Description du protocole scientifique prévu (ex. capture et relâcher immédiat avec ou sans marquage, prélèvement de matériel biologique, autres cas).';


--
-- Name: COLUMN dossier.scientifique_mode_capture; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.scientifique_mode_capture IS 'Dans le contexte d''un dossier dont l''activité principale est la recherche scientifique. Modes de capture utilisés';


--
-- Name: COLUMN dossier."scientifique_modalités_source_lumineuses"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."scientifique_modalités_source_lumineuses" IS 'null signifie qu''il n''y a pas d''utilisation de sources lumineuses';


--
-- Name: COLUMN dossier."scientifique_modalités_marquage"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."scientifique_modalités_marquage" IS 'Modalités de marquage des individus';


--
-- Name: COLUMN dossier."scientifique_modalités_transport"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."scientifique_modalités_transport" IS 'Modalités de transport des individus';


--
-- Name: COLUMN dossier."scientifique_périmètre_intervention"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."scientifique_périmètre_intervention" IS 'Périmètre géographique de l''intervention scientifique';


--
-- Name: COLUMN dossier.scientifique_intervenants; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.scientifique_intervenants IS 'Liste des intervenants scientifiques';


--
-- Name: COLUMN dossier."scientifique_précisions_autres_intervenants"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."scientifique_précisions_autres_intervenants" IS 'Précisions sur les autres intervenants scientifiques';


--
-- Name: COLUMN dossier.justification_absence_autre_solution_satisfaisante; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.justification_absence_autre_solution_satisfaisante IS 'Article L411-2 I.4 du code de l''environnement';


--
-- Name: COLUMN dossier."motif_dérogation"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."motif_dérogation" IS 'Article L411-2 I.4 a) b) c) d) e) du code de l''environnement';


--
-- Name: COLUMN dossier."justification_motif_dérogation"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."justification_motif_dérogation" IS 'Justification du motif de dérogation';


--
-- Name: COLUMN dossier."mesures_erc_prévues"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."mesures_erc_prévues" IS 'Indique si des mesures ERC (Éviter, Réduire, Compenser) sont prévues';


--
-- Name: COLUMN dossier."scientifique_bilan_antérieur"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."scientifique_bilan_antérieur" IS 'Réponse à la question "Cette demande concerne un programme de suivi déjà existant"';


--
-- Name: COLUMN dossier."scientifique_finalité_demande"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."scientifique_finalité_demande" IS 'Réponse à la question "Captures/Relâchers/Prélèvement - Finalité(s) de la demande"';


--
-- Name: COLUMN dossier."nombre_nids_détruits_dossier_oiseau_simple"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."nombre_nids_détruits_dossier_oiseau_simple" IS 'Réponse à la question "Nombre de nids d''Hirondelles détruits"';


--
-- Name: COLUMN dossier."nombre_nids_compensés_dossier_oiseau_simple"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier."nombre_nids_compensés_dossier_oiseau_simple" IS 'Réponse à la question "Indiquer le nombre de nids artificiels posés en compensation". Concerne les dossiers spécifiques à des oiseaux, comme les hirondelles ou les cigognes.';


--
-- Name: COLUMN dossier.type; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.type IS 'Type du dossier. Les instructeurices ont des typologies de dossiers qui reviennent souvent, comme les dossiers Hirondelles, les dossiers Cigognes...';


--
-- Name: COLUMN dossier.etat_des_lieux_ecologique_complet_realise; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.etat_des_lieux_ecologique_complet_realise IS 'Réponse à la question : "Avez-vous réalisé un état des lieux écologique complet $1"';


--
-- Name: COLUMN dossier.presence_especes_dans_aire_influence; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.presence_especes_dans_aire_influence IS 'Réponse à la question : "Des spécimens ou habitats d''espèces protégées sont-ils présents dans l''aire d''influence de votre projet $1"';


--
-- Name: COLUMN dossier.risque_malgre_mesures_erc; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.risque_malgre_mesures_erc IS 'Réponse à la question : "Après mises en oeuvre de mesures d''évitement et de réduction, un risque suffisamment caractérisé pour les espèces protégées demeure-t-il $1"';


--
-- Name: COLUMN dossier.date_fin_consultation_public; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.dossier.date_fin_consultation_public IS 'Valeur pour le champ : "Date de fin de la consultation du public ou enquête publique"';


--
-- Name: dossier_id_seq; Type: SEQUENCE; Schema: public; Owner: dev
--

CREATE SEQUENCE public.dossier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.dossier_id_seq OWNER TO dev;

--
-- Name: dossier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev
--

ALTER SEQUENCE public.dossier_id_seq OWNED BY public.dossier.id;


--
-- Name: décision_administrative; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."décision_administrative" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dossier integer NOT NULL,
    "numéro" character varying(255),
    type character varying(255),
    date_signature date,
    date_fin_obligations date,
    fichier uuid
);


ALTER TABLE public."décision_administrative" OWNER TO dev;

--
-- Name: COLUMN "décision_administrative".dossier; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."décision_administrative".dossier IS 'Référence vers le dossier associé à cette décision administrative. Un dossier peut avoir plusieurs décisions administratives au cours de son instruction (ex: arrêté préfectoral, arrêté ministériel, etc.).';


--
-- Name: COLUMN "décision_administrative"."numéro"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."décision_administrative"."numéro" IS 'Numéro officiel de la décision administrative. Ce numéro est généralement attribué par l''administration et permet d''identifier formellement la décision dans les systèmes administratifs.';


--
-- Name: COLUMN "décision_administrative".type; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."décision_administrative".type IS 'Type de décision administrative. Peut être par exemple : Arrêté refus, Arrêté modification, Arrêté dérogation, Autre décision...';


--
-- Name: COLUMN "décision_administrative".date_signature; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."décision_administrative".date_signature IS 'Date de signature de la décision administrative par l''autorité compétente. Cette date marque l''entrée en vigueur de la décision et le début des obligations pour le bénéficiaire.';


--
-- Name: COLUMN "décision_administrative".date_fin_obligations; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."décision_administrative".date_fin_obligations IS 'Date de fin des obligations imposées par la décision administrative. Cette date marque la fin de la période de validité de la décision et des prescriptions associées.';


--
-- Name: COLUMN "décision_administrative".fichier; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public."décision_administrative".fichier IS 'Référence vers le fichier contenant la décision administrative.';


--
-- Name: entreprise; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public.entreprise (
    siret character varying(14) NOT NULL,
    raison_sociale character varying(255),
    adresse character varying(255)
);


ALTER TABLE public.entreprise OWNER TO dev;

--
-- Name: fichier; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public.fichier (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(255),
    media_type character varying(255),
    contenu bytea,
    "DS_checksum" character varying(255),
    "DS_createdAt" timestamp with time zone
);


ALTER TABLE public.fichier OWNER TO dev;

--
-- Name: groupe_instructeurs; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public.groupe_instructeurs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(255) NOT NULL,
    "numéro_démarche" integer NOT NULL
);


ALTER TABLE public.groupe_instructeurs OWNER TO dev;

--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.knex_migrations OWNER TO dev;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: dev
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.knex_migrations_id_seq OWNER TO dev;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.knex_migrations_lock OWNER TO dev;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: dev
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.knex_migrations_lock_index_seq OWNER TO dev;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: message; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public.message (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contenu text,
    date timestamp(0) with time zone,
    "email_expéditeur" character varying(255),
    "id_démarches_simplifiées" character varying(255),
    dossier integer
);


ALTER TABLE public.message OWNER TO dev;

--
-- Name: personne; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public.personne (
    id integer NOT NULL,
    nom character varying(255),
    "prénoms" character varying(255),
    email character varying(255),
    "code_accès" character varying(255)
);


ALTER TABLE public.personne OWNER TO dev;

--
-- Name: COLUMN personne.nom; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.personne.nom IS 'Nom de famille de la personne. Identité civile';


--
-- Name: COLUMN personne."prénoms"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.personne."prénoms" IS 'Prénoms de la personne. Identité civile';


--
-- Name: COLUMN personne.email; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.personne.email IS 'Adresse email de la personne. Utilisée pour la communication, l''authentification et l''identification unique de l''utilisateur dans le système.';


--
-- Name: COLUMN personne."code_accès"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.personne."code_accès" IS 'Code d''accès unique de la personne. Permet de récupérer un lot de capabilities dans la table, notamment dans la table arête_cap_dossier__groupe_nstructeur';


--
-- Name: personne_id_seq; Type: SEQUENCE; Schema: public; Owner: dev
--

CREATE SEQUENCE public.personne_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.personne_id_seq OWNER TO dev;

--
-- Name: personne_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev
--

ALTER SEQUENCE public.personne_id_seq OWNED BY public.personne.id;


--
-- Name: prescription; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public.prescription (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "décision_administrative" uuid NOT NULL,
    "date_échéance" date,
    "numéro_article" character varying(255),
    description text,
    "surface_évitée" integer,
    "surface_compensée" integer,
    "nids_évités" integer,
    "nids_compensés" integer,
    "individus_évités" integer,
    "individus_compensés" integer
);


ALTER TABLE public.prescription OWNER TO dev;

--
-- Name: COLUMN prescription."décision_administrative"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.prescription."décision_administrative" IS 'Référence vers la décision administrative associée à cette prescription. Une décision administrative peut contenir plusieurs prescriptions détaillant les obligations spécifiques à respecter.';


--
-- Name: COLUMN prescription."date_échéance"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.prescription."date_échéance" IS 'Date limite à laquelle la prescription doit être respectée. Les contrôles de cette prescription s''effectuent dès lors que la date d''échéance est dépassée.';


--
-- Name: COLUMN prescription."numéro_article"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.prescription."numéro_article" IS 'Numéro de l''article de la prescription. Permet d''identifier et de référencer précisément la prescription dans le cadre de la décision administrative.';


--
-- Name: COLUMN prescription.description; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.prescription.description IS 'Description détaillée de la prescription. Explique précisément ce qui doit être fait, comment et dans quelles conditions pour respecter l''obligation imposée.';


--
-- Name: COLUMN prescription."surface_évitée"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.prescription."surface_évitée" IS 'Surface en m² qui a été évitée grâce aux mesures de protection mises en place.';


--
-- Name: COLUMN prescription."surface_compensée"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.prescription."surface_compensée" IS 'Surface en m² qui a été compensée pour atténuer les impacts du projet.';


--
-- Name: COLUMN prescription."nids_évités"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.prescription."nids_évités" IS 'Dans le contexte d''un dossier qui impacte une espèce qui est un oiseau. Nombre de nids qui ont été évités grâce aux mesures de protection mises en place.';


--
-- Name: COLUMN prescription."nids_compensés"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.prescription."nids_compensés" IS 'Dans le contexte d''un dossier qui impacte une espèce qui est un oiseau. Nombre de nids qui ont été compensés pour atténuer les impacts du projet.';


--
-- Name: COLUMN prescription."individus_évités"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.prescription."individus_évités" IS 'Nombre d''individus qui ont été évités grâce aux mesures de protection mises en place.';


--
-- Name: COLUMN prescription."individus_compensés"; Type: COMMENT; Schema: public; Owner: dev
--

COMMENT ON COLUMN public.prescription."individus_compensés" IS 'Nombre d''individus qui ont été compensés pour atténuer les impacts du projet.';


--
-- Name: résultat_synchronisation_DS_88444; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."résultat_synchronisation_DS_88444" (
    "succès" boolean NOT NULL,
    horodatage timestamp(0) with time zone NOT NULL,
    erreur text
);


ALTER TABLE public."résultat_synchronisation_DS_88444" OWNER TO dev;

--
-- Name: évènement_phase_dossier; Type: TABLE; Schema: public; Owner: dev
--

CREATE TABLE public."évènement_phase_dossier" (
    dossier integer NOT NULL,
    phase character varying(255) NOT NULL,
    horodatage timestamp(0) with time zone NOT NULL,
    cause_personne integer,
    "DS_emailAgentTraitant" character varying(255),
    "DS_motivation" text
);


ALTER TABLE public."évènement_phase_dossier" OWNER TO dev;

--
-- Name: dossier id; Type: DEFAULT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.dossier ALTER COLUMN id SET DEFAULT nextval('public.dossier_id_seq'::regclass);


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Name: personne id; Type: DEFAULT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.personne ALTER COLUMN id SET DEFAULT nextval('public.personne_id_seq'::regclass);


--
-- Name: arête_groupe_instructeurs__dossier arête_groupe_instructeurs__dossier_dossier_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."arête_groupe_instructeurs__dossier"
    ADD CONSTRAINT "arête_groupe_instructeurs__dossier_dossier_unique" UNIQUE (dossier);


--
-- Name: arête_personne__cap_écriture_annotation arête_personne__cap_écriture_annotation_personne_cap_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."arête_personne__cap_écriture_annotation"
    ADD CONSTRAINT "arête_personne__cap_écriture_annotation_personne_cap_unique" UNIQUE (personne_cap);


--
-- Name: arête_personne_suit_dossier arête_personne_suit_dossier_dossier_personne_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."arête_personne_suit_dossier"
    ADD CONSTRAINT "arête_personne_suit_dossier_dossier_personne_unique" UNIQUE (dossier, personne);


--
-- Name: avis_expert avis_expert_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.avis_expert
    ADD CONSTRAINT avis_expert_pkey PRIMARY KEY (id);


--
-- Name: cap_dossier cap_dossier_personne_cap_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.cap_dossier
    ADD CONSTRAINT cap_dossier_personne_cap_unique UNIQUE (personne_cap);


--
-- Name: cap_dossier cap_dossier_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.cap_dossier
    ADD CONSTRAINT cap_dossier_pkey PRIMARY KEY (cap);


--
-- Name: cap_écriture_annotation cap_écriture_annotation_instructeur_id_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."cap_écriture_annotation"
    ADD CONSTRAINT "cap_écriture_annotation_instructeur_id_unique" UNIQUE (instructeur_id);


--
-- Name: cap_écriture_annotation cap_écriture_annotation_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."cap_écriture_annotation"
    ADD CONSTRAINT "cap_écriture_annotation_pkey" PRIMARY KEY (cap);


--
-- Name: contrôle contrôle_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."contrôle"
    ADD CONSTRAINT "contrôle_pkey" PRIMARY KEY (id);


--
-- Name: dossier dossier_id_demarches_simplifiées_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.dossier
    ADD CONSTRAINT "dossier_id_demarches_simplifiées_unique" UNIQUE ("id_demarches_simplifiées");


--
-- Name: dossier dossier_number_demarches_simplifiées_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.dossier
    ADD CONSTRAINT "dossier_number_demarches_simplifiées_unique" UNIQUE ("number_demarches_simplifiées");


--
-- Name: dossier dossier_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.dossier
    ADD CONSTRAINT dossier_pkey PRIMARY KEY (id);


--
-- Name: décision_administrative décision_administrative_dossier_numéro_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."décision_administrative"
    ADD CONSTRAINT "décision_administrative_dossier_numéro_unique" UNIQUE (dossier, "numéro");


--
-- Name: décision_administrative décision_administrative_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."décision_administrative"
    ADD CONSTRAINT "décision_administrative_pkey" PRIMARY KEY (id);


--
-- Name: entreprise entreprise_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.entreprise
    ADD CONSTRAINT entreprise_pkey PRIMARY KEY (siret);


--
-- Name: fichier espèces_impactées_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.fichier
    ADD CONSTRAINT "espèces_impactées_pkey" PRIMARY KEY (id);


--
-- Name: groupe_instructeurs groupe_instructeurs_nom_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.groupe_instructeurs
    ADD CONSTRAINT groupe_instructeurs_nom_unique UNIQUE (nom);


--
-- Name: groupe_instructeurs groupe_instructeurs_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.groupe_instructeurs
    ADD CONSTRAINT groupe_instructeurs_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: message message_id_démarches_simplifiées_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT "message_id_démarches_simplifiées_unique" UNIQUE ("id_démarches_simplifiées");


--
-- Name: message message_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_pkey PRIMARY KEY (id);


--
-- Name: personne personne_code_accès_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.personne
    ADD CONSTRAINT "personne_code_accès_unique" UNIQUE ("code_accès");


--
-- Name: personne personne_email_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.personne
    ADD CONSTRAINT personne_email_unique UNIQUE (email);


--
-- Name: personne personne_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.personne
    ADD CONSTRAINT personne_pkey PRIMARY KEY (id);


--
-- Name: prescription prescription_pkey; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.prescription
    ADD CONSTRAINT prescription_pkey PRIMARY KEY (id);


--
-- Name: résultat_synchronisation_DS_88444 résultat_synchronisation_ds_88444_succès_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."résultat_synchronisation_DS_88444"
    ADD CONSTRAINT "résultat_synchronisation_ds_88444_succès_unique" UNIQUE ("succès");


--
-- Name: évènement_phase_dossier évènement_phase_dossier_dossier_phase_horodatage_unique; Type: CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."évènement_phase_dossier"
    ADD CONSTRAINT "évènement_phase_dossier_dossier_phase_horodatage_unique" UNIQUE (dossier, phase, horodatage);


--
-- Name: arête_cap_dossier__groupe_instructeurs_cap_dossier_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "arête_cap_dossier__groupe_instructeurs_cap_dossier_index" ON public."arête_cap_dossier__groupe_instructeurs" USING btree (cap_dossier);


--
-- Name: arête_personne_suit_dossier_dossier_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "arête_personne_suit_dossier_dossier_index" ON public."arête_personne_suit_dossier" USING btree (dossier);


--
-- Name: arête_personne_suit_dossier_personne_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "arête_personne_suit_dossier_personne_index" ON public."arête_personne_suit_dossier" USING btree (personne);


--
-- Name: avis_expert_dossier_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX avis_expert_dossier_index ON public.avis_expert USING btree (dossier);


--
-- Name: contrôle_prescription_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "contrôle_prescription_index" ON public."contrôle" USING btree (prescription);


--
-- Name: dossier_demandeur_personne_morale_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX dossier_demandeur_personne_morale_index ON public.dossier USING btree (demandeur_personne_morale);


--
-- Name: dossier_demandeur_personne_physique_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX dossier_demandeur_personne_physique_index ON public.dossier USING btree (demandeur_personne_physique);


--
-- Name: dossier_déposant_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "dossier_déposant_index" ON public.dossier USING btree ("déposant");


--
-- Name: décision_administrative_dossier_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "décision_administrative_dossier_index" ON public."décision_administrative" USING btree (dossier);


--
-- Name: décision_administrative_numéro_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "décision_administrative_numéro_index" ON public."décision_administrative" USING btree ("numéro");


--
-- Name: espèces_impactées_ds_checksum_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "espèces_impactées_ds_checksum_index" ON public.fichier USING btree ("DS_checksum");


--
-- Name: espèces_impactées_ds_createdat_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "espèces_impactées_ds_createdat_index" ON public.fichier USING btree ("DS_createdAt");


--
-- Name: message_dossier_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX message_dossier_index ON public.message USING btree (dossier);


--
-- Name: prescription_décision_administrative_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "prescription_décision_administrative_index" ON public.prescription USING btree ("décision_administrative");


--
-- Name: évènement_phase_dossier_dossier_index; Type: INDEX; Schema: public; Owner: dev
--

CREATE INDEX "évènement_phase_dossier_dossier_index" ON public."évènement_phase_dossier" USING btree (dossier);


--
-- Name: arête_cap_dossier__groupe_instructeurs arête_cap_dossier__groupe_instructeurs_cap_dossier_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."arête_cap_dossier__groupe_instructeurs"
    ADD CONSTRAINT "arête_cap_dossier__groupe_instructeurs_cap_dossier_foreign" FOREIGN KEY (cap_dossier) REFERENCES public.cap_dossier(cap) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: arête_cap_dossier__groupe_instructeurs arête_cap_dossier__groupe_instructeurs_groupe_instructeurs_for; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."arête_cap_dossier__groupe_instructeurs"
    ADD CONSTRAINT "arête_cap_dossier__groupe_instructeurs_groupe_instructeurs_for" FOREIGN KEY (groupe_instructeurs) REFERENCES public.groupe_instructeurs(id) ON DELETE CASCADE;


--
-- Name: arête_groupe_instructeurs__dossier arête_groupe_instructeurs__dossier_dossier_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."arête_groupe_instructeurs__dossier"
    ADD CONSTRAINT "arête_groupe_instructeurs__dossier_dossier_foreign" FOREIGN KEY (dossier) REFERENCES public.dossier(id) ON DELETE CASCADE;


--
-- Name: arête_groupe_instructeurs__dossier arête_groupe_instructeurs__dossier_groupe_instructeurs_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."arête_groupe_instructeurs__dossier"
    ADD CONSTRAINT "arête_groupe_instructeurs__dossier_groupe_instructeurs_foreign" FOREIGN KEY (groupe_instructeurs) REFERENCES public.groupe_instructeurs(id) ON DELETE CASCADE;


--
-- Name: arête_personne__cap_écriture_annotation arête_personne__cap_écriture_annotation_personne_cap_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."arête_personne__cap_écriture_annotation"
    ADD CONSTRAINT "arête_personne__cap_écriture_annotation_personne_cap_foreign" FOREIGN KEY (personne_cap) REFERENCES public.personne("code_accès") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: arête_personne__cap_écriture_annotation arête_personne__cap_écriture_annotation_écriture_annotation_; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."arête_personne__cap_écriture_annotation"
    ADD CONSTRAINT "arête_personne__cap_écriture_annotation_écriture_annotation_" FOREIGN KEY ("écriture_annotation_cap") REFERENCES public."cap_écriture_annotation"(cap) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: arête_personne_suit_dossier arête_personne_suit_dossier_dossier_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."arête_personne_suit_dossier"
    ADD CONSTRAINT "arête_personne_suit_dossier_dossier_foreign" FOREIGN KEY (dossier) REFERENCES public.dossier(id) ON DELETE CASCADE;


--
-- Name: arête_personne_suit_dossier arête_personne_suit_dossier_personne_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."arête_personne_suit_dossier"
    ADD CONSTRAINT "arête_personne_suit_dossier_personne_foreign" FOREIGN KEY (personne) REFERENCES public.personne(id) ON DELETE CASCADE;


--
-- Name: avis_expert avis_expert_avis_fichier_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.avis_expert
    ADD CONSTRAINT avis_expert_avis_fichier_foreign FOREIGN KEY (avis_fichier) REFERENCES public.fichier(id);


--
-- Name: avis_expert avis_expert_dossier_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.avis_expert
    ADD CONSTRAINT avis_expert_dossier_foreign FOREIGN KEY (dossier) REFERENCES public.dossier(id) ON DELETE CASCADE;


--
-- Name: avis_expert avis_expert_saisine_fichier_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.avis_expert
    ADD CONSTRAINT avis_expert_saisine_fichier_foreign FOREIGN KEY (saisine_fichier) REFERENCES public.fichier(id);


--
-- Name: cap_dossier cap_dossier_personne_cap_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.cap_dossier
    ADD CONSTRAINT cap_dossier_personne_cap_foreign FOREIGN KEY (personne_cap) REFERENCES public.personne("code_accès") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contrôle contrôle_prescription_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."contrôle"
    ADD CONSTRAINT "contrôle_prescription_foreign" FOREIGN KEY (prescription) REFERENCES public.prescription(id) ON DELETE CASCADE;


--
-- Name: dossier dossier_demandeur_personne_morale_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.dossier
    ADD CONSTRAINT dossier_demandeur_personne_morale_foreign FOREIGN KEY (demandeur_personne_morale) REFERENCES public.entreprise(siret);


--
-- Name: dossier dossier_demandeur_personne_physique_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.dossier
    ADD CONSTRAINT dossier_demandeur_personne_physique_foreign FOREIGN KEY (demandeur_personne_physique) REFERENCES public.personne(id);


--
-- Name: dossier dossier_déposant_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.dossier
    ADD CONSTRAINT "dossier_déposant_foreign" FOREIGN KEY ("déposant") REFERENCES public.personne(id);


--
-- Name: dossier dossier_espèces_impactées_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.dossier
    ADD CONSTRAINT "dossier_espèces_impactées_foreign" FOREIGN KEY ("espèces_impactées") REFERENCES public.fichier(id) ON DELETE SET NULL;


--
-- Name: décision_administrative décision_administrative_dossier_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."décision_administrative"
    ADD CONSTRAINT "décision_administrative_dossier_foreign" FOREIGN KEY (dossier) REFERENCES public.dossier(id) ON DELETE CASCADE;


--
-- Name: décision_administrative décision_administrative_fichier_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."décision_administrative"
    ADD CONSTRAINT "décision_administrative_fichier_foreign" FOREIGN KEY (fichier) REFERENCES public.fichier(id);


--
-- Name: message message_dossier_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT message_dossier_foreign FOREIGN KEY (dossier) REFERENCES public.dossier(id) ON DELETE CASCADE;


--
-- Name: prescription prescription_décision_administrative_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.prescription
    ADD CONSTRAINT "prescription_décision_administrative_foreign" FOREIGN KEY ("décision_administrative") REFERENCES public."décision_administrative"(id) ON DELETE CASCADE;


--
-- Name: évènement_phase_dossier évènement_phase_dossier_cause_personne_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."évènement_phase_dossier"
    ADD CONSTRAINT "évènement_phase_dossier_cause_personne_foreign" FOREIGN KEY (cause_personne) REFERENCES public.personne(id) ON DELETE CASCADE;


--
-- Name: évènement_phase_dossier évènement_phase_dossier_dossier_foreign; Type: FK CONSTRAINT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public."évènement_phase_dossier"
    ADD CONSTRAINT "évènement_phase_dossier_dossier_foreign" FOREIGN KEY (dossier) REFERENCES public.dossier(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

