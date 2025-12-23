-- Enable storage extension if not already (it usually is by default in Supabase)

-- 1. Create Buckets
-- Note: In some Supabase setups, you might need to do this via Dashboard.
-- Attempting to insert into storage.buckets if permissions allow.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('licenses', 'licenses', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehicles', 'vehicles', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies

-- PROFILE PHOTOS
CREATE POLICY "Public Profile Photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-photos' );

CREATE POLICY "Users can upload own profile photo"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Users can update own profile photo"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Users can delete own profile photo"
ON storage.objects FOR DELETE
USING ( bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1] );

-- LICENSES (Private)
CREATE POLICY "Drivers view own licenses"
ON storage.objects FOR SELECT
USING ( bucket_id = 'licenses' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Drivers upload own licenses"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'licenses' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Drivers update own licenses"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'licenses' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Drivers delete own licenses"
ON storage.objects FOR DELETE
USING ( bucket_id = 'licenses' AND auth.uid()::text = (storage.foldername(name))[1] );

-- VEHICLES (Public)
CREATE POLICY "Public Vehicle Photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'vehicles' );

CREATE POLICY "Drivers upload own vehicle photos"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'vehicles' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Drivers update own vehicle photos"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'vehicles' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Drivers delete own vehicle photos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'vehicles' AND auth.uid()::text = (storage.foldername(name))[1] );

-- DOCUMENTS (Private)
CREATE POLICY "Users view own documents"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Users upload own documents"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Users update own documents"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Users delete own documents"
ON storage.objects FOR DELETE
USING ( bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] );

-- 3. Helper Functions for File Path Management

-- Function to extract user ID from file path
CREATE OR REPLACE FUNCTION get_file_owner(file_path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (string_to_array(file_path, '/'))[1];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Triggers for Database Consistency

-- Trigger to update profile_photo field when user uploads new profile photo
CREATE OR REPLACE FUNCTION update_user_profile_photo()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET profile_photo = storage.object_url(NEW.bucket_id, NEW.name)
  WHERE id = get_file_owner(NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_photo_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'profile-photos')
  EXECUTE FUNCTION update_user_profile_photo();
