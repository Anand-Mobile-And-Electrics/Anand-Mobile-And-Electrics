-- Migration 2B.3: Products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    description TEXT,
    image_url TEXT,
    image_storage_path TEXT,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for scanner lookup
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_brand ON public.products(brand_id);

-- Trigger to normalize barcode (trim leading/trailing whitespace)
CREATE OR REPLACE FUNCTION public.normalize_barcode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.barcode IS NOT NULL THEN
        NEW.barcode := btrim(NEW.barcode);
        IF NEW.barcode = '' THEN
            NEW.barcode := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_barcode
    BEFORE INSERT OR UPDATE OF barcode ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_barcode();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Prevent direct current_stock modification via normal UPDATE
CREATE OR REPLACE FUNCTION public.protect_current_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.current_stock IS DISTINCT FROM OLD.current_stock AND current_setting('app.bypass_stock_protect', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'current_stock cannot be modified directly. Use adjust_stock() RPC.';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_current_stock
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_current_stock();

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.products
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for owners and managers" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (public.get_auth_role() IN ('owner', 'manager') AND current_stock = 0);

CREATE POLICY "Enable update for owners and managers" ON public.products
    FOR UPDATE TO authenticated
    USING (public.get_auth_role() IN ('owner', 'manager'))
    WITH CHECK (public.get_auth_role() IN ('owner', 'manager'));

CREATE POLICY "Enable delete for owners" ON public.products
    FOR DELETE TO authenticated
    USING (public.get_auth_role() = 'owner');
