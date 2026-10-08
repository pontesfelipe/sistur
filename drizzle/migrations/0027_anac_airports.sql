CREATE TABLE public.anac_airports (
  icao text PRIMARY KEY,
  iata text,
  name text,
  municipality text,
  uf text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  departures_12m integer NOT NULL DEFAULT 0,
  passengers_12m bigint NOT NULL DEFAULT 0,
  international_departures_12m integer NOT NULL DEFAULT 0,
  flights_per_week numeric GENERATED ALWAYS AS (round(departures_12m::numeric / 52.0, 1)) STORED,
  reference_period_start date,
  reference_period_end date,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.anac_airports TO authenticated;
GRANT ALL ON public.anac_airports TO service_role;
ALTER TABLE public.anac_airports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read airports" ON public.anac_airports FOR SELECT TO authenticated USING (true);
CREATE INDEX anac_airports_coords_idx ON public.anac_airports (latitude, longitude);