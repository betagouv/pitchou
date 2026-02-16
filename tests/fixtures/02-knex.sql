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

ALTER TABLE IF EXISTS ONLY public.knex_migrations DROP CONSTRAINT IF EXISTS knex_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.knex_migrations_lock DROP CONSTRAINT IF EXISTS knex_migrations_lock_pkey;
ALTER TABLE IF EXISTS public.knex_migrations_lock ALTER COLUMN index DROP DEFAULT;
ALTER TABLE IF EXISTS public.knex_migrations ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.knex_migrations_lock_index_seq;
DROP TABLE IF EXISTS public.knex_migrations_lock;
DROP SEQUENCE IF EXISTS public.knex_migrations_id_seq;
DROP TABLE IF EXISTS public.knex_migrations;
SET default_tablespace = '';

SET default_table_access_method = heap;

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
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: dev
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public.knex_migrations (id, name, batch, migration_time) FROM stdin;
1	20240521145459_init.js	1	2024-05-22 11:05:05.602+00
2	20240522130558_ajout-localisation-dossier.js	2	2024-05-22 14:08:19.078+00
3	20240527151149_ajout-déposant.js	3	2024-05-29 13:32:54.655+00
4	20240529134326_ajout-demandeur-dossier.js	4	2024-05-29 17:53:28.735+00
5	20240529184142_ajout-régions.js	5	2024-05-29 20:13:48.536+00
6	20240612130105_agrandir-champs-texte.js	6	2024-06-12 13:17:16.531+00
7	20240717132256_début-annotations-privées.js	7	2024-07-17 21:15:08.482+00
8	20240724202601_ajout-commentaire-libre.js	8	2024-07-25 09:14:05.654+00
9	20240731135259_dossiers-supprimés.js	9	2024-07-31 20:23:48.973+00
10	20240731192043_ajout-ae.js	10	2024-08-12 20:31:24.231+00
11	20240729151539_ajout-groupes-instructeurs.js	11	2024-08-15 13:39:49.169+00
12	20240801164222_ajout-phase-et-prochaine-action-attendue.js	11	2024-08-15 13:39:49.175+00
13	20240912110240_ajouter-capability-instructeur-id.js	12	2024-09-18 13:17:33.26+00
14	20240918135633_on-update-code-acces.js	13	2024-09-18 14:20:11.648+00
15	20240923075429_ajout-messages-dossier.js	14	2024-10-09 11:57:01.761+00
16	20241009132822_ajout-suivis-dossiers.js	15	2024-10-11 10:28:49.58+00
17	20241015134835_dossiers_par_groupe_instructeur.js	16	2024-10-28 15:45:32.228+00
18	20241021153538_ajout-activite-principale-au-dossier.js	17	2024-10-28 15:55:25.347+00
19	20241112160307_ajout-evenements-phases-dossier.js	18	2024-11-13 07:32:53.676+00
20	20241209160440_ajout-fichier-espèces-impactées.js	19	2024-12-10 14:52:55.16+00
21	20241129155523_données-espèces-protégées.js	20	2024-12-10 16:22:36.625+00
22	20241210110932_ajout-cause-evenement-phase-dossier.js	21	2024-12-18 10:43:17.932+00
23	20241218144809_données-nettoyage-évènements-phases.js	22	2024-12-18 16:59:56.468+00
24	20241219145031_suppression-prochaine-action-attendue.js	23	2025-01-02 14:50:51.157+00
25	20250102093943_renomme-phase-vérification.js	23	2025-01-02 14:50:51.2+00
26	20250110101538_drop-null-date-depot.js	24	2025-01-22 15:27:19.214+00
27	20250102142531_ajout-colonnes-DS-espèces_impactées.js	25	2025-01-27 10:21:24.429+00
28	20250211141923_ajout-indicateur-synchronisation.js	26	2025-02-12 11:09:03.863+00
29	20250212141849_supprimer-annotations-en-attente-et-commentaire-libre.js	27	2025-02-21 09:40:47.534+00
30	20250225154953_ajout-champs-traitements-DS-evenements-phase-dossier.js	28	2025-02-27 09:23:55.028+00
31	20250422092232_refacto-fichiers.js	29	2025-04-22 12:28:12.306+00
32	20250422125650_refacto-dossier-espèces-impactées.js	30	2025-04-22 17:18:24.725+00
33	20250423075923_retirer-propriété-fichier-dossier.js	31	2025-04-23 09:23:28.681+00
34	20250425122624_decisions-administratives.js	32	2025-05-19 13:08:17.841+00
35	20250520090805_ajout-champs-derog-scientifique.js	33	2025-06-04 09:27:18.016+00
36	20250610123907_suppression-champs-dossiers-décision.js	34	2025-06-10 13:19:21.875+00
37	20250611093428_ajout-prescriptions.js	35	2025-06-19 09:48:16.449+00
38	20250620071437_ajout-champs-alternatives-motifs-justification-motif-dossier.js	36	2025-06-20 13:04:45.224+00
39	20250702095313_ajout-mesures_erc_prevues.js	37	2025-07-04 07:15:35.581+00
40	20250709103430_ajout-controles.js	38	2025-07-10 10:06:52.919+00
41	20250711101151_suppression-colonne-statut-dossier.js	39	2025-07-11 08:25:20.312+00
42	20250727153505_renommer-commentaire-enjeu-en-commentaire-libre.js	40	2025-07-29 14:31:11.205+00
43	20250728133643_suivi-unique.js	40	2025-07-29 14:31:11.231+00
44	20250729134353_ajout-commentaire-instructeur_id.js	41	2025-07-29 14:37:09.19+00
45	20250730064943_mise-a-jour-date-depot-avec-historique-date-reception-ddep.js	42	2025-08-11 08:25:01.76+00
46	20250730070221_supprimer-historique_date_réception_ddep.js	43	2025-08-12 07:53:34.155+00
47	20250731055408_avis-expert.js	44	2025-08-18 15:27:36.039+00
48	20250812105730_chantier-ajout-commentaires-tables.js	45	2025-08-18 19:53:41.63+00
49	20250822115513_ajout-autres-balises-scientifiques.js	46	2025-09-02 14:09:54.586+00
50	20250901085523_ajout-balises-nids-compenses-nids-detruits.js	47	2025-09-17 07:00:53.451+00
51	20250917145054_normalisation-email.js	48	2025-09-17 15:16:52.376+00
52	20251006123551_supprimer-espèces_protégées_concernées-historique_nom_porteur-historique_localisation-colonnes-csrpn-cnpn.js	49	2025-10-13 06:20:26.157+00
53	20250929095751_ajout_numéro_démarche.js	50	2025-10-14 13:26:36.744+00
54	20251106152328_fix_departements.js	51	2025-11-06 15:56:26.788+00
55	20251104080759_ajouter-3-questions-introductives-de-demarches-simplifiees-d-un-dossier.js	52	2025-11-07 10:28:46.683+00
56	20251111141823_ajouter-date-fin-consultation-public-et-renommer-date-consultation-public-en-date-debut-consultation-public.js	53	2025-11-12 10:47:37.378+00
57	20251104153744_ajout-pièces-jointes-pétitionnaire.js	54	2025-11-17 08:56:41.028+00
58	20260106140913_ajout_evenements_metriques.js	55	2026-01-06 17:35:50.024+00
59	20260107110936_ajout-index-evenement.js	56	2026-01-07 11:58:40.151+00
60	20260108073247_changer-type-ddep-necessaire-par-booleen.js	57	2026-01-09 10:29:56.694+00
61	20260114103000_ajout-mesures-er-suffisantes.js	58	2026-01-19 12:01:24.44+00
62	20251204175154_triggers-suppression-fichiers-avis-expert.js	59	2026-01-27 11:43:36.788+00
63	20260126143259_ajout-capability-geomce.js	60	2026-01-28 14:57:24.725+00
75	20260129095854_commentaire-libre-default-chaine-vide.js	61	2026-02-16 09:46:12.483+00
76	20260206151046_ajout-notification.js	62	2026-02-16 09:46:26.516+00
\.


--
-- Data for Name: knex_migrations_lock; Type: TABLE DATA; Schema: public; Owner: dev
--

COPY public.knex_migrations_lock (index, is_locked) FROM stdin;
12	0
\.


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev
--

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 76, true);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: dev
--

SELECT pg_catalog.setval('public.knex_migrations_lock_index_seq', 12, true);


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
-- PostgreSQL database dump complete
--

