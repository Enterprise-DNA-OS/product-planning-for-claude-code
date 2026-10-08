CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TABLE releases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
 due_date date NOT NULL, capacity_days numeric NOT NULL CHECK(capacity_days>=0),
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','shipped','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE features (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference text NOT NULL UNIQUE, name text NOT NULL,
 description text NOT NULL DEFAULT '', owner text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'backlog' CHECK(status IN ('backlog','planned','in_progress','shipped','cancelled')),
 release_id uuid REFERENCES releases(id), reach numeric NOT NULL DEFAULT 0 CHECK(reach>=0),
 impact numeric NOT NULL DEFAULT 1 CHECK(impact>=0 AND impact<=5),
 confidence numeric NOT NULL DEFAULT 0.5 CHECK(confidence>=0 AND confidence<=1),
 effort_days numeric NOT NULL DEFAULT 1 CHECK(effort_days>0), revision integer NOT NULL DEFAULT 1,
 last_reviewed date, source_row jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dependencies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), feature_id uuid NOT NULL REFERENCES features(id),
 blocker_id uuid NOT NULL REFERENCES features(id), CHECK(feature_id<>blocker_id), UNIQUE(feature_id,blocker_id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), feature_id uuid NOT NULL REFERENCES features(id),
 organisation text NOT NULL, summary text NOT NULL, personal boolean NOT NULL DEFAULT false,
 purpose text NOT NULL DEFAULT '', review_on date, legal_hold boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), feature_id uuid NOT NULL REFERENCES features(id),
 revision integer NOT NULL, outcome text NOT NULL CHECK(outcome IN ('approve','defer','reject')),
 reason text NOT NULL, actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), feature_id uuid REFERENCES features(id),
 action text NOT NULL, actor text NOT NULL, detail jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['releases','features','dependencies','feedback','decisions','activity'] LOOP
 EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',t);
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON %I FROM public',t);
END LOOP; END $$;
CREATE VIEW priority_queue AS SELECT f.reference,f.name,f.owner,f.status,
 round(f.reach*f.impact*f.confidence/f.effort_days,2) AS priority_score,f.effort_days,
 (SELECT count(*) FROM feedback b WHERE b.feature_id=f.id) AS feedback_count,
 (SELECT count(*) FROM dependencies d JOIN features b ON b.id=d.blocker_id WHERE d.feature_id=f.id AND b.status<>'shipped') AS blockers,
 r.name AS release,f.last_reviewed
 FROM features f LEFT JOIN releases r ON r.id=f.release_id WHERE f.status NOT IN ('shipped','cancelled');
CREATE VIEW release_readiness AS SELECT r.id,r.name,r.due_date,r.status,r.capacity_days,
 coalesce(sum(f.effort_days) FILTER(WHERE f.status NOT IN ('shipped','cancelled')),0) AS remaining_days,
 count(f.id) FILTER(WHERE f.status NOT IN ('shipped','cancelled')) AS open_features,
 count(f.id) FILTER(WHERE f.status NOT IN ('shipped','cancelled') AND NOT EXISTS(
 SELECT 1 FROM decisions d WHERE d.id=(SELECT x.id FROM decisions x WHERE x.feature_id=f.id ORDER BY x.created_at DESC,x.id DESC LIMIT 1)
 AND d.revision=f.revision AND d.outcome='approve')) AS unapproved_features
 FROM releases r LEFT JOIN features f ON f.release_id=r.id GROUP BY r.id;
CREATE VIEW retention_queue AS SELECT b.id,f.reference,b.organisation,b.purpose,b.review_on,b.legal_hold,
 CASE WHEN b.legal_hold THEN 'Hold: owner review, do not erase'
 WHEN b.purpose='' THEN 'Missing retention purpose'
 WHEN b.review_on IS NULL THEN 'Missing review date'
 ELSE 'Retention review overdue' END AS issue
 FROM feedback b JOIN features f ON f.id=b.feature_id
 WHERE b.personal AND (b.legal_hold OR b.purpose='' OR b.review_on IS NULL OR b.review_on<=current_date);
REVOKE ALL ON priority_queue,release_readiness,retention_queue FROM public;
