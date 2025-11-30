# Admin Directory

This directory contains the administrative interface for managing question edits and blacklists on the Scio.ly platform.

## Files

### `page.tsx`
Main admin dashboard component. Provides a password-protected interface for reviewing and managing question edits and blacklisted questions.

**Key Features:**
- Password authentication via `PasswordAuth` component
- Two-tab interface: "Edits" and "Removed"
- Displays statistics: total edits, resolvable edits, removed records, resolvable removed
- Groups edits and blacklists by event
- Bulk operations: apply all edits, undo all edits, apply all removes, restore all removes
- Individual operations: undo edit, undo removal

**Example Usage:**
```277:569:src/app/admin/page.tsx
export default function AdminPage() {
  const { darkMode } = useTheme();
  const [data, setData] = useState<AdminOverview>({ edits: [], blacklists: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"edits" | "removed">("edits");
  const [bulkBusy, setBulkBusy] = useState<Record<string, boolean>>({});
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState<string>("");

  // ... authentication and data fetching logic ...
  
  if (!isAuthenticated) {
    return <PasswordAuth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Admin dashboard UI */}
    </div>
  );
}
```

**Important Notes:**
- Requires admin password authentication before accessing
- Fetches data from `/api/admin` endpoint with `X-Admin-Password` header
- Uses theme context for dark/light mode support
- Shows question details including original vs edited versions
- Displays whether edits can be automatically resolved (have question IDs)

### `PasswordAuth.tsx`
Password authentication component for admin access.

**Key Features:**
- Password input form
- Validates password against `/api/admin` endpoint
- Shows error messages for incorrect passwords
- Theme-aware styling (dark/light mode)
- Calls `onAuthenticated` callback with password on success

**Example Usage:**
```7:54:src/app/admin/PasswordAuth.tsx
interface PasswordAuthProps {
  onAuthenticated: (password: string) => void;
}

export default function PasswordAuth({ onAuthenticated }: PasswordAuthProps) {
  const { darkMode } = useTheme();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": password,
        },
      });

      if (response.status === 401) {
        setError("Incorrect password");
        return;
      }

      if (!response.ok) {
        setError("Authentication failed");
        return;
      }

      onAuthenticated(password);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
```

**Important Notes:**
- Password is sent in `X-Admin-Password` header (not in request body)
- Password is stored in component state and passed to parent for subsequent API calls
- Uses theme context for consistent styling

## API Integration

The admin interface communicates with `/api/admin` route:

**GET `/api/admin`**
- Returns list of edits and blacklists
- Requires `X-Admin-Password` header
- Returns statistics including total counts and resolvable counts by event

**POST `/api/admin`**
- Accepts actions: `undoEdit`, `undoAllEdits`, `applyAllEdits`, `undoRemove`, `restoreAllRemoved`, `applyAllRemoved`
- Requires `X-Admin-Password` header
- Body: `{ action: string, id?: string }`

## Data Structures

### EditRow
```typescript
type EditRow = {
  id: string;
  event: string;
  original: Record<string, unknown>;
  edited: Record<string, unknown>;
  updatedAt: string;
  canLocateTarget?: boolean;
};
```

### BlacklistRow
```typescript
type BlacklistRow = {
  id: string;
  event: string;
  question: Record<string, unknown>;
  createdAt: string;
  existsInQuestions?: boolean;
};
```

## Important Notes

1. **Security**: Admin password is stored in environment variable `ADMIN_PASSWORD` and must be set for the API to work
2. **Question Resolution**: Edits with question IDs can be automatically resolved. Those without IDs require manual mapping
3. **Bulk Operations**: Bulk operations process all records but may skip some if target questions cannot be located
4. **Theme Support**: All components support dark/light mode via theme context
5. **Error Handling**: Failed operations show toast notifications and error messages
