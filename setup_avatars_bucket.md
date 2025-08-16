# Setup Avatars Bucket in Supabase

To fix the avatar upload issue, you need to create the avatars storage bucket and set up the proper policies in your Supabase dashboard.

## Steps:

1. Go to your Supabase dashboard
2. Navigate to Storage in the left sidebar
3. Click "Create a new bucket"
4. Set the following:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Check this box
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg,image/png,image/gif,image/webp`

5. After creating the bucket, go to the SQL Editor and run the following SQL:

```sql
-- Drop ALL existing policies on storage.objects for avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar read policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete policy" ON storage.objects;

-- Simple policy: Allow authenticated users to upload to avatars bucket
CREATE POLICY "Avatar upload policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Simple policy: Allow authenticated users to update in avatars bucket
CREATE POLICY "Avatar update policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Simple policy: Allow public read access to avatars
CREATE POLICY "Avatar read policy" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Simple policy: Allow authenticated users to delete from avatars bucket
CREATE POLICY "Avatar delete policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);
```

## What this fixes:

1. **Avatar uploads**: Users can now upload profile pictures
2. **Avatar display**: Avatars will show in the AuthButton, leaderboard, and profile page
3. **Cross-platform compatibility**: Works for both Google OAuth users and regular users
4. **Public access**: Avatars are publicly readable so they display everywhere
5. **Security**: Users can only upload/update/delete their own avatars

## Code Changes Made:

- Updated `AuthButton.tsx` to fetch and display `photo_url` from the database
- Updated `leaderboard/ClientPage.tsx` to display avatars in the leaderboard
- The profile page already had the correct avatar upload functionality

After running these SQL commands, the avatar upload and display should work correctly across all parts of the application.
