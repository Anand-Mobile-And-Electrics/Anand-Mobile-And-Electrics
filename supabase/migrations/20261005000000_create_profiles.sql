-- Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name text,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'technician')) DEFAULT 'technician',
  phone text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
-- 1. Users can read their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- 2. Create a secure function to fetch the user's role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Owners and Managers can view all profiles
CREATE POLICY "Staff management viewing"
ON public.profiles
FOR SELECT
USING (
  public.get_auth_role() IN ('owner', 'manager')
);

-- 4. Only Owners can insert/update profiles
CREATE POLICY "Owner administration"
ON public.profiles
FOR ALL
USING (
  public.get_auth_role() = 'owner'
);

-- Create a function to automatically insert a profile when a new user signs up.
-- NOTE: In this closed-registration system, the owner will invite/create users.
-- When a user is created in auth.users, this trigger sets them up as a technician by default,
-- unless their metadata contains a role. The owner can update it later.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'technician')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
