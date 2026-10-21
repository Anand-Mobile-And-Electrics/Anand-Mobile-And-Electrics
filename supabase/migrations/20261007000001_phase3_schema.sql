-- Migration 1: Phase 3 Schema, Types, and Base Configuration
-- File: supabase/migrations/20261007000001_phase3_schema.sql

-- 1. Create Enums
CREATE TYPE public.repair_status AS ENUM (
  'received',
  'diagnosing',
  'waiting_for_approval',
  'in_repair',
  'ready',
  'completed',
  'cancelled'
);

-- 2. Create Customers Table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Devices Table
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  imei_serial TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, customer_id)
);

-- 4. Create Job Number Sequence
CREATE SEQUENCE public.repair_job_number_seq START 1000;

-- 5. Create Repairs Table
CREATE TABLE public.repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  device_id UUID NOT NULL,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status public.repair_status NOT NULL DEFAULT 'received',
  required_work TEXT NOT NULL,
  repair_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (device_id, customer_id) REFERENCES public.devices(id, customer_id) ON DELETE RESTRICT
);

-- 6. Create Repair History Table
CREATE TABLE public.repair_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id UUID NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  old_status public.repair_status,
  new_status public.repair_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create Repair Photos Metadata Table
CREATE TABLE public.repair_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id UUID NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_photos ENABLE ROW LEVEL SECURITY;
