# Profile Directory

This directory contains the user profile management system for the Scio.ly platform. Allows users to manage their personal information, preferences, and account settings.

## Files

### `page.tsx`
Client component for user profile management.

**Key Features:**
- Profile information display and editing
- Display name, first name, last name, username management
- Profile picture upload
- Account information display
- Theme-aware styling

**Example:**
```17:76:src/app/profile/page.tsx
export default function ProfilePage() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const { user: ctxUser, client } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const supabase = client;
    const currentUser = ctxUser || null;
    setUser(currentUser);
    (async () => {
      if (currentUser) {
        const { data } = await supabase
          .from("users")
          .select("display_name, first_name, last_name, username, photo_url")
          .eq("id", currentUser.id)
          .maybeSingle();
        // ... load profile data
      } else {
        router.push("/");
      }
      setAuthInitialized(true);
      setLoading(false);
    })();
  }, [router, ctxUser, client]);
```

**Profile Fields:**
- **Email**: Read-only, cannot be changed
- **Display Name**: How name appears to other users (max 50 characters)
- **First Name**: User's first name
- **Last Name**: User's last name
- **Username**: Unique username (defaults to email prefix)
- **Profile Picture**: Uploadable profile photo (max 5MB)

**Profile Picture Upload:**
```152:201:src/app/profile/page.tsx
const handlePhotoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!(file && user)) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    toast.error("Please select an image file");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    // 5mb limit
    toast.error("Image must be 5MB or less");
    return;
  }

  setUploadingPhoto(true);
  try {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `users/${user.id}.${fileExt}`;

    const { error: uploadError } = await client.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    // ... handle upload
  }
};
```

**Save Profile:**
```79:150:src/app/profile/page.tsx
const handleSave = async () => {
  if (!user) {
    return;
  }

  if (displayName && displayName.length > 50) {
    toast.error("Display name must be 50 characters or less");
    return;
  }

  setSaving(true);

  try {
    const { error } = await client.from("users").upsert(
      {
        id: user.id,
        email: user.email || "",
        username: username || user.email?.split("@")[0] || "user",
        first_name: firstName || null,
        last_name: lastName || null,
        display_name: displayName || null,
        photo_url: photoUrl || null,
        created_at: new Date().toISOString(),
      } as any,
      { onConflict: "id" }
    );
    // ... handle save
  }
};
```

**Account Information Display:**
- Account created date
- Last sign in date
- Email confirmation status

## Important Notes

1. **Authentication Required**: Users must be logged in to access profile
2. **Supabase Storage**: Profile data stored in Supabase `users` table
3. **Photo Storage**: Profile pictures stored in Supabase Storage `avatars` bucket
4. **Username Uniqueness**: Usernames must be unique (enforced by database)
5. **Display Name Limit**: 50 character maximum
6. **Photo Size Limit**: 5MB maximum for profile pictures
7. **Local Storage**: Display name and username cached in localStorage
8. **Sync API**: Profile changes synced to `/api/profile/sync` endpoint
9. **Theme Support**: Full dark/light mode support
10. **Validation**: Client-side validation for all fields
