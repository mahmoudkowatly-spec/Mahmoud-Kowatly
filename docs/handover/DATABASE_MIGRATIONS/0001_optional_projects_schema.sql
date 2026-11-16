-- NOT APPLIED. The live app has no database tables; this is an optional schema
-- that mirrors the browser localStorage model (see DATABASE_SCHEMA.md).

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  org_name TEXT NOT NULL DEFAULT '',
  governorate TEXT NOT NULL DEFAULT '',
  ref_number TEXT NOT NULL DEFAULT '',
  discount_percent NUMERIC(7,4) NOT NULL DEFAULT 0,
  logo_data_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.estimate_items (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  rate NUMERIC(14,2) NOT NULL DEFAULT 0,
  qty NUMERIC(14,3) NOT NULL DEFAULT 1,
  section TEXT NOT NULL CHECK (section IN ('ordinary','sanitary','electrical')),
  part TEXT NOT NULL DEFAULT '',
  page INT NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX estimate_items_project_idx ON public.estimate_items(project_id, position);
CREATE INDEX projects_user_idx ON public.projects(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects, public.estimate_items TO authenticated;
GRANT USAGE ON SEQUENCE public.estimate_items_id_seq TO authenticated;
GRANT ALL ON public.projects, public.estimate_items TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own projects" ON public.projects FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own items" ON public.estimate_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
