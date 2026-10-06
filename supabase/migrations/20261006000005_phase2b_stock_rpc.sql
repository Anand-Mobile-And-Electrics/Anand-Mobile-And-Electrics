-- Migration 2B.5: Stock RPC
CREATE OR REPLACE FUNCTION public.adjust_stock(
    p_product_id UUID,
    p_quantity INTEGER,
    p_type TEXT,
    p_reference TEXT DEFAULT NULL,
    p_is_adjustment_increase BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_delta INTEGER;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    -- 1. Identify authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: must be authenticated';
    END IF;

    -- 2. Determine user's role
    v_role := public.get_auth_role();
    IF v_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: role not found';
    END IF;

    -- 3. Validate Quantity
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Invalid quantity: must be greater than 0';
    END IF;

    -- 4. Validate movement type & permissions, and derive delta
    IF p_type IN ('receive', 'returned') THEN
        IF v_role NOT IN ('owner', 'manager') THEN
            RAISE EXCEPTION 'Permission denied: technicians cannot perform %', p_type;
        END IF;
        v_delta := p_quantity;
    ELSIF p_type IN ('sold', 'damaged', 'lost') THEN
        IF v_role NOT IN ('owner', 'manager') THEN
            RAISE EXCEPTION 'Permission denied: technicians cannot perform %', p_type;
        END IF;
        v_delta := -p_quantity;
    ELSIF p_type = 'adjustment' THEN
        IF v_role NOT IN ('owner', 'manager') THEN
            RAISE EXCEPTION 'Permission denied: technicians cannot perform adjustment';
        END IF;
        IF p_is_adjustment_increase IS NULL THEN
            RAISE EXCEPTION 'adjustment requires p_is_adjustment_increase parameter';
        END IF;
        IF p_is_adjustment_increase THEN
            v_delta := p_quantity;
        ELSE
            v_delta := -p_quantity;
        END IF;
    ELSIF p_type = 'used_for_repair' THEN
        -- Technicians are explicitly allowed this.
        v_delta := -p_quantity;
    ELSE
        RAISE EXCEPTION 'Invalid movement type: %', p_type;
    END IF;

    -- 5. Lock product row and calculate
    SELECT current_stock INTO v_current_stock 
    FROM public.products 
    WHERE id = p_product_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    v_new_stock := v_current_stock + v_delta;

    -- 6. Validate resulting stock
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock. Current stock is %', v_current_stock;
    END IF;

    -- 7. Update products current_stock
    -- Bypass the protect trigger
    PERFORM set_config('app.bypass_stock_protect', 'true', true);
    
    UPDATE public.products 
    SET current_stock = v_new_stock,
        updated_at = now()
    WHERE id = p_product_id;

    -- 8. Insert immutable movement record
    INSERT INTO public.stock_movements (
        product_id, quantity_delta, movement_type, reference_note, created_by
    ) VALUES (
        p_product_id, v_delta, p_type, p_reference, v_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_stock', v_new_stock
    );
END;
$$;

-- Revoke execution from public
REVOKE EXECUTE ON FUNCTION public.adjust_stock(UUID, INTEGER, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_stock(UUID, INTEGER, TEXT, TEXT, BOOLEAN) TO authenticated;
