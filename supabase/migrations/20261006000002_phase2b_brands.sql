-- Migration 2B.2: Brands
CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.brands
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable all access for owners and managers" ON public.brands
    FOR ALL TO authenticated
    USING (public.get_auth_role() IN ('owner', 'manager'))
    WITH CHECK (public.get_auth_role() IN ('owner', 'manager'));
