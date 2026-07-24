-- Algorithm accuracy tracking: snapshots what the rule engine predicted
-- at the moment an admin labels a number (confirmed_scam / cleared /
-- under_investigation) via flagged_numbers. This turns every admin
-- decision into a labeled (prediction, ground-truth) pair — the dataset
-- a future ML model would need, collected for free as a side effect of
-- normal moderation.

-- 1) Labeled snapshot table
CREATE TABLE public.risk_prediction_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  admin_label public.flag_status NOT NULL,
  predicted_status text NOT NULL,
  predicted_risk_score int NOT NULL DEFAULT 0,
  total_reports int NOT NULL DEFAULT 0,
  recent_24h int NOT NULL DEFAULT 0,
  pattern_match boolean NOT NULL DEFAULT false,
  labeled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_labels_phone ON public.risk_prediction_labels(phone_number);
CREATE INDEX idx_risk_labels_combo ON public.risk_prediction_labels(admin_label, predicted_status);
CREATE INDEX idx_risk_labels_created ON public.risk_prediction_labels(created_at DESC);

ALTER TABLE public.risk_prediction_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read risk prediction labels"
  ON public.risk_prediction_labels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policy for regular callers: rows are only ever
-- written by the SECURITY DEFINER trigger below.

-- 2) Trigger function: fires whenever an admin sets/changes a flag status.
-- Captures what phone_status() currently says, alongside the admin's
-- final verdict, as a permanent labeled record.
CREATE OR REPLACE FUNCTION public.capture_risk_prediction_label()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ps jsonb;
  pm boolean;
  score int;
BEGIN
  -- Only snapshot on insert or on an actual status change, not on every
  -- notes edit / no-op upsert.
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  ps := public.phone_status(NEW.phone_number);

  SELECT EXISTS (
    SELECT 1 FROM scam_reports
    WHERE phone_number = NEW.phone_number AND status = 'approved'
    GROUP BY scam_type
    HAVING count(*) >= 2
  ) INTO pm;

  score := CASE coalesce(ps->>'status', 'unknown')
    WHEN 'high_risk_scam' THEN 90
    WHEN 'suspicious' THEN 60
    WHEN 'unverified' THEN 30
    ELSE 0
  END;

  INSERT INTO public.risk_prediction_labels
    (phone_number, admin_label, predicted_status, predicted_risk_score,
     total_reports, recent_24h, pattern_match, labeled_by)
  VALUES (
    NEW.phone_number,
    NEW.status,
    coalesce(ps->>'status', 'unknown'),
    score,
    coalesce((ps->>'total')::int, 0),
    coalesce((ps->>'recent_24h')::int, 0),
    coalesce(pm, false),
    auth.uid()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_risk_prediction ON public.flagged_numbers;
CREATE TRIGGER trg_capture_risk_prediction
  AFTER INSERT OR UPDATE OF status ON public.flagged_numbers
  FOR EACH ROW EXECUTE FUNCTION public.capture_risk_prediction_label();

-- 3) Accuracy summary RPC (admin-only)
CREATE OR REPLACE FUNCTION public.algorithm_accuracy_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
  correct int;
  false_positive int;
  false_negative int;
  matrix jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO total FROM risk_prediction_labels;

  SELECT count(*) INTO correct FROM risk_prediction_labels
    WHERE (admin_label = 'confirmed_scam' AND predicted_status IN ('high_risk_scam', 'suspicious'))
       OR (admin_label = 'cleared' AND predicted_status IN ('unknown', 'unverified'));

  SELECT count(*) INTO false_positive FROM risk_prediction_labels
    WHERE admin_label = 'cleared' AND predicted_status IN ('high_risk_scam', 'suspicious');

  SELECT count(*) INTO false_negative FROM risk_prediction_labels
    WHERE admin_label = 'confirmed_scam' AND predicted_status IN ('unknown', 'unverified');

  SELECT coalesce(jsonb_object_agg(key, val), '{}'::jsonb) INTO matrix FROM (
    SELECT admin_label::text || '__' || predicted_status AS key, count(*) AS val
    FROM risk_prediction_labels
    GROUP BY admin_label, predicted_status
  ) s;

  RETURN jsonb_build_object(
    'total_labels', coalesce(total, 0),
    'correct', coalesce(correct, 0),
    'accuracy_pct', CASE WHEN total > 0 THEN round(correct::numeric / total * 100, 1) ELSE null END,
    'false_positives', coalesce(false_positive, 0),
    'false_negatives', coalesce(false_negative, 0),
    'matrix', matrix
  );
END;
$$;

-- 4) Raw labeled dataset, for future export / model training (admin-only)
CREATE OR REPLACE FUNCTION public.list_risk_prediction_labels(_limit int DEFAULT 200)
RETURNS SETOF public.risk_prediction_labels
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT * FROM public.risk_prediction_labels
    ORDER BY created_at DESC
    LIMIT _limit;
END;
$$;
