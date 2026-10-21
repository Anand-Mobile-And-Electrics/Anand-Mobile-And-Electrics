-- Migration 2: Phase 3 Functions, Triggers, and RLS
-- File: supabase/migrations/20261007000002_phase3_logic.sql

-- 1. Helper Functions for RLS (SECURITY DEFINER to prevent recursion)
CREATE OR REPLACE FUNCTION public.is_assigned_to_repair_customer(c_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.repairs 
    WHERE customer_id = c_id AND assigned_to = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_to_repair_device(d_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.repairs 
    WHERE device_id = d_id AND assigned_to = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_to_repair(r_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.repairs 
    WHERE id = r_id AND assigned_to = auth.uid()
  );
$$;

-- 2. General updated_at Trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_repairs_updated_at BEFORE UPDATE ON public.repairs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Global Protections & Technician Immutability
CREATE OR REPLACE FUNCTION public.protect_customer_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF public.get_auth_role() = 'technician' THEN
    IF NEW.id <> OLD.id OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Technicians cannot alter id or created_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER check_customer_immutability BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.protect_customer_fields();

CREATE OR REPLACE FUNCTION public.protect_device_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF public.get_auth_role() = 'technician' THEN
    IF NEW.id <> OLD.id OR NEW.customer_id <> OLD.customer_id OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Technicians cannot alter id, customer_id, or created_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER check_device_immutability BEFORE UPDATE ON public.devices
FOR EACH ROW EXECUTE FUNCTION public.protect_device_fields();

CREATE OR REPLACE FUNCTION public.protect_repair_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Global Protection: Nobody changes job_number on update
  IF NEW.job_number IS DISTINCT FROM OLD.job_number THEN
    RAISE EXCEPTION 'job_number is immutable';
  END IF;

  -- Global Protection: Reject direct completed_at manipulation by clients
  -- At the start of the BEFORE trigger, if NEW != OLD, the client explicitly sent a value
  IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION 'Direct manipulation of completed_at is not allowed';
  END IF;

  -- Handle status-based completed_at updates natively
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    NEW.completed_at = now();
  ELSIF NEW.status <> 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;

  -- Technician-specific immutability
  IF public.get_auth_role() = 'technician' THEN
    IF NEW.id <> OLD.id OR 
       NEW.customer_id <> OLD.customer_id OR 
       NEW.device_id <> OLD.device_id OR 
       NEW.assigned_to <> OLD.assigned_to OR 
       NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Technicians cannot alter id, customer_id, device_id, assigned_to, or created_at';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER check_repair_immutability BEFORE UPDATE ON public.repairs
FOR EACH ROW EXECUTE FUNCTION public.protect_repair_fields();


-- 4. Job Number & Insert Protections
CREATE OR REPLACE FUNCTION public.handle_repair_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Always override client input with a sequence-generated job number
  NEW.job_number = 'JOB-' || nextval('public.repair_job_number_seq')::TEXT;
  
  -- Prevent client from providing a completed_at value on insert
  IF NEW.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Direct manipulation of completed_at is not allowed';
  END IF;

  IF NEW.status = 'completed' THEN
    NEW.completed_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER tr_handle_repair_insert BEFORE INSERT ON public.repairs
FOR EACH ROW EXECUTE FUNCTION public.handle_repair_insert();


-- 5. Repair History Trigger
CREATE OR REPLACE FUNCTION public.log_repair_history()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth.uid() cannot be null when changing repair status';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'auth.uid() does not match any profile';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.repair_history (repair_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.repair_history (repair_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER tr_log_repair_history AFTER INSERT OR UPDATE ON public.repairs
FOR EACH ROW EXECUTE FUNCTION public.log_repair_history();


-- 6. Repair Photos Path Validation Trigger
CREATE OR REPLACE FUNCTION public.validate_repair_photo_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT (NEW.storage_path LIKE (NEW.repair_id::TEXT || '/%')) THEN
    RAISE EXCEPTION 'storage_path must start with repair_id/';
  END IF;
  IF NEW.uploaded_by <> auth.uid() THEN
    RAISE EXCEPTION 'uploaded_by must match auth.uid()';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER tr_validate_repair_photo_metadata BEFORE INSERT ON public.repair_photos
FOR EACH ROW EXECUTE FUNCTION public.validate_repair_photo_metadata();


-- 7. RLS Policies
-- CUSTOMERS
CREATE POLICY "Owner/Manager ALL on customers" ON public.customers
FOR ALL TO authenticated USING (public.get_auth_role() IN ('owner', 'manager'));

CREATE POLICY "Technician SELECT on assigned customers" ON public.customers
FOR SELECT TO authenticated USING (public.get_auth_role() = 'technician' AND public.is_assigned_to_repair_customer(id));

CREATE POLICY "Technician INSERT on customers" ON public.customers
FOR INSERT TO authenticated WITH CHECK (public.get_auth_role() = 'technician');

CREATE POLICY "Technician UPDATE on assigned customers" ON public.customers
FOR UPDATE TO authenticated USING (public.get_auth_role() = 'technician' AND public.is_assigned_to_repair_customer(id))
WITH CHECK (public.get_auth_role() = 'technician' AND public.is_assigned_to_repair_customer(id));

-- DEVICES
CREATE POLICY "Owner/Manager ALL on devices" ON public.devices
FOR ALL TO authenticated USING (public.get_auth_role() IN ('owner', 'manager'));

CREATE POLICY "Technician SELECT on assigned devices" ON public.devices
FOR SELECT TO authenticated USING (public.get_auth_role() = 'technician' AND public.is_assigned_to_repair_device(id));

CREATE POLICY "Technician INSERT on devices" ON public.devices
FOR INSERT TO authenticated WITH CHECK (public.get_auth_role() = 'technician');

CREATE POLICY "Technician UPDATE on assigned devices" ON public.devices
FOR UPDATE TO authenticated USING (public.get_auth_role() = 'technician' AND public.is_assigned_to_repair_device(id))
WITH CHECK (public.get_auth_role() = 'technician' AND public.is_assigned_to_repair_device(id));

-- REPAIRS
CREATE POLICY "Owner/Manager ALL on repairs" ON public.repairs
FOR ALL TO authenticated USING (public.get_auth_role() IN ('owner', 'manager'));

CREATE POLICY "Technician SELECT on assigned repairs" ON public.repairs
FOR SELECT TO authenticated USING (public.get_auth_role() = 'technician' AND assigned_to = auth.uid());

CREATE POLICY "Technician INSERT on assigned repairs" ON public.repairs
FOR INSERT TO authenticated WITH CHECK (public.get_auth_role() = 'technician' AND assigned_to = auth.uid());

CREATE POLICY "Technician UPDATE on assigned repairs" ON public.repairs
FOR UPDATE TO authenticated USING (public.get_auth_role() = 'technician' AND assigned_to = auth.uid())
WITH CHECK (public.get_auth_role() = 'technician' AND assigned_to = auth.uid());

-- REPAIR HISTORY
CREATE POLICY "Owner/Manager/Technician SELECT on history" ON public.repair_history
FOR SELECT TO authenticated USING (
  public.get_auth_role() IN ('owner', 'manager') OR
  (public.get_auth_role() = 'technician' AND public.is_assigned_to_repair(repair_id))
);

-- NO INSERT/UPDATE/DELETE POLICIES FOR REPAIR_HISTORY
-- This ensures it is strictly append-only via the trigger, bypassing RLS as SECURITY DEFINER

-- REPAIR PHOTOS METADATA
CREATE POLICY "Owner/Manager ALL on photos metadata" ON public.repair_photos
FOR ALL TO authenticated USING (public.get_auth_role() IN ('owner', 'manager'));

CREATE POLICY "Technician SELECT on assigned photos metadata" ON public.repair_photos
FOR SELECT TO authenticated USING (public.get_auth_role() = 'technician' AND public.is_assigned_to_repair(repair_id));

CREATE POLICY "Technician INSERT on assigned photos metadata" ON public.repair_photos
FOR INSERT TO authenticated WITH CHECK (public.get_auth_role() = 'technician' AND public.is_assigned_to_repair(repair_id));

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('repair-photos', 'repair-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']) 
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES
CREATE POLICY "Owner/Manager ALL on storage"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'repair-photos' AND public.get_auth_role() IN ('owner', 'manager'))
WITH CHECK (bucket_id = 'repair-photos' AND public.get_auth_role() IN ('owner', 'manager'));

CREATE POLICY "Technician SELECT on assigned storage"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'repair-photos' AND public.get_auth_role() = 'technician' AND public.is_assigned_to_repair((split_part(name, '/', 1))::uuid));

CREATE POLICY "Technician INSERT on assigned storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'repair-photos' AND public.get_auth_role() = 'technician' AND public.is_assigned_to_repair((split_part(name, '/', 1))::uuid));
