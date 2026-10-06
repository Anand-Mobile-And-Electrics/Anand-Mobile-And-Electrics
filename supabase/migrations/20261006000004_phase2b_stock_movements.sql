-- Migration 2B.4: Stock Movements
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_delta INTEGER NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('receive', 'sold', 'returned', 'used_for_repair', 'damaged', 'lost', 'adjustment')),
    reference_note TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.stock_movements
    FOR SELECT TO authenticated USING (true);
-- NO INSERT, UPDATE, or DELETE policies for normal users.
-- The RPC operates with SECURITY DEFINER and bypasses RLS for the insert.
