'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { User } from '@supabase/supabase-js';
import { useTheme } from '@/app/contexts/ThemeContext';
import { Save, User as UserIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '@/app/components/Header';
import Image from 'next/image';

export default function ProfilePage() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const { user: ctxUser, client } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // Sync from context
    const supabase = client as any;
    const currentUser = ctxUser || null;
    setUser(currentUser);
    (async () => {
      if (currentUser) {
        const { data } = await supabase
          .from('users')
          .select('display_name, first_name, last_name, username, photo_url')
          .eq('id', currentUser.id)
          .maybeSingle();
        const defaultName = currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || '';
        setDisplayName(data?.display_name || defaultName || '');
        setFirstName(data?.first_name || '');
        setLastName(data?.last_name || '');
        setUsername(data?.username || (currentUser.email?.split('@')[0] || ''));
        setPhotoUrl(data?.photo_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null);
      } else {
        router.push('/');
      }
      setAuthInitialized(true);
      setLoading(false);
    })();
  }, [router, ctxUser, client]);

  const handleSave = async () => {
    if (!user) return;
    
    if (displayName && displayName.length > 50) {
      toast.error('Display name must be 50 characters or less');
      return;
    }

    setSaving(true);

    try {
      const { error } = await (client as any)
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || '',
          username: username || (user.email?.split('@')[0] || 'user'),
          first_name: firstName || null,
          last_name: lastName || null,
          display_name: displayName || null,
          photo_url: photoUrl || null,
          created_at: new Date().toISOString(),
        } as any, { onConflict: 'id' });

      if (error) {
        if ((error as any)?.code === '23505') {
          toast.error('That username is already taken.');
        } else {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile. Please try again.');
        }
      } else {
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image must be 5MB or less');
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `users/${user.id}.${fileExt}`;
      // Upload with upsert
      const { error: uploadError } = await client.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload image. Ensure the avatars bucket exists and is public.');
        return;
      }
      const { data: publicUrlData } = client.storage.from('avatars').getPublicUrl(path);
      const publicUrl = publicUrlData.publicUrl;
      setPhotoUrl(publicUrl);
      // Persist photo_url
      await (client as any)
        .from('users')
        .update({ photo_url: publicUrl } as any)
        .eq('id', user.id);
      toast.success('Profile picture updated!');
    } catch (err) {
      console.error('Photo upload failed:', err);
      toast.error('Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading || !authInitialized) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Header />
        <div className="pt-20 flex items-center justify-center min-h-[calc(100vh-5rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to home
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Header />
      {/* Global ToastContainer handles notifications */}
      
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Profile Settings
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your account settings and preferences
            </p>
          </div>

          {/* Profile Form */}
          <div className={`rounded-lg p-6 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {/* Profile Picture */}
            <div className="flex items-center mb-6">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt="Profile"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="ml-4">
                <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Profile Picture
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {photoUrl ? 'Custom profile picture' : 'No profile picture available'}
                </p>
                <div className="mt-2">
                  <label className={`inline-flex items-center px-3 py-1.5 rounded-md cursor-pointer ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoFileChange} />
                    {uploadingPhoto ? 'Uploading…' : 'Change Photo'}
                  </label>
                </div>
              </div>
            </div>

            {/* Email (Read-only) */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email Address
              </label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className={`w-full px-3 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-400' 
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                } cursor-not-allowed`}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Email address cannot be changed
              </p>
            </div>

            {/* Display Name */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={50}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                This is how your name will appear to other users ({displayName.length}/50)
              </p>
            </div>

            {/* First / Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>

            {/* Username */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Must be unique. Defaults to your email before the @ if left blank.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Account Information */}
          <div className={`mt-6 rounded-lg p-6 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Account Information
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Account Created
                </span>
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Last Sign In
                </span>
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Email Confirmed
                </span>
                <span className={`text-sm ${
                  user.email_confirmed_at 
                    ? 'text-green-600' 
                    : darkMode ? 'text-red-400' : 'text-red-600'
                }`}>
                  {user.email_confirmed_at ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pb-8"></div>
    </div>
  );
}