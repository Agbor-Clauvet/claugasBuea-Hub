
CREATE TABLE IF NOT EXISTS public.service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL DEFAULT 'Buea',
  quarter text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city, quarter)
);

GRANT SELECT ON public.service_areas TO anon, authenticated;
GRANT ALL ON public.service_areas TO service_role;

ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service areas are readable by everyone"
  ON public.service_areas FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage service areas"
  ON public.service_areas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER service_areas_set_updated_at
  BEFORE UPDATE ON public.service_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.service_areas (city, quarter, sort_order) VALUES
  ('Buea', 'Molyko', 1),
  ('Buea', 'Great Soppo', 2),
  ('Buea', 'Small Soppo', 3),
  ('Buea', 'Bonduma', 4),
  ('Buea', 'Bomaka', 5),
  ('Buea', 'Bokwango', 6),
  ('Buea', 'Muea', 7),
  ('Buea', 'Mile 16', 8),
  ('Buea', 'Check Point', 9),
  ('Buea', 'Long Street', 10),
  ('Buea', 'Buea Town', 11),
  ('Buea', 'Government Residential Area (GRA)', 12),
  ('Buea', 'Clerks Quarter', 13),
  ('Buea', 'Federal Quarters', 14),
  ('Buea', 'Bokwai', 15)
ON CONFLICT (city, quarter) DO NOTHING;

ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS quarter text;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS landmark text;
