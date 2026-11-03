CREATE FUNCTION record_demande_revision(target integer) RETURNS void LANGUAGE plpgsql AS $$
DECLARE snapshot jsonb; revision_id bigint;
BEGIN
  snapshot := demande_state(target);
  IF snapshot IS NULL THEN RETURN; END IF;
  IF snapshot IS NOT DISTINCT FROM (SELECT state FROM demande_revision WHERE dossier = target ORDER BY id DESC LIMIT 1)
    THEN RETURN; END IF;
  INSERT INTO demande_revision(dossier, transaction_id, state) VALUES(target, txid_current(), snapshot)
    ON CONFLICT (dossier, transaction_id) DO NOTHING RETURNING id INTO revision_id;
  IF revision_id IS NOT NULL THEN
    INSERT INTO demande_revision_file(revision, fichier, relation, expert)
      SELECT revision_id, fichier, relation, expert FROM demande_files(target);
  END IF;
END;
$$;

CREATE FUNCTION queue_demande_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target integer;
BEGIN
  IF TG_OP = 'UPDATE' AND to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN RETURN NEW; END IF;
  -- Each internal query resolves both old and new owners before a deletion can remove its joins.
  FOR target IN EXECUTE TG_ARGV[0] || ' ORDER BY 1' USING to_jsonb(OLD), to_jsonb(NEW) LOOP
    -- Serialize independent child-table writes to the same demande through commit.
    PERFORM pg_advisory_xact_lock(2105112026, target);
    INSERT INTO demande_revision_pending VALUES(txid_current(), target) ON CONFLICT DO NOTHING;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE FUNCTION flush_demande_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- A transaction can touch several child tables: retain its complete final state once.
  PERFORM record_demande_revision(NEW.dossier);
  DELETE FROM demande_revision_pending WHERE transaction_id = NEW.transaction_id AND dossier = NEW.dossier;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER flush_demande_revision AFTER INSERT ON demande_revision_pending
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION flush_demande_revision();

CREATE FUNCTION protect_demande_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Historical demande states are immutable';
END;
$$;
CREATE TRIGGER protect_demande_revision BEFORE UPDATE ON demande_revision
  FOR EACH ROW EXECUTE FUNCTION protect_demande_revision();
