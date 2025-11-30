# Offline Directory

This directory contains the offline functionality page for the Scio.ly platform. Allows users to download events for offline practice.

## Files

### `page.tsx`
Client component for managing offline event downloads.

**Key Features:**
- Lists available events for download
- Download event questions to IndexedDB
- Track downloaded events
- Special handling for Codebusters (quotes)

**Example:**
```15:165:src/app/offline/page.tsx
export default function OfflinePage() {
  const { darkMode } = useTheme();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const approvedEvents = [
      "Anatomy - Nervous",
      "Anatomy - Endocrine",
      "Anatomy - Sense Organs",
      "Astronomy",
      "Chemistry Lab",
      // ... more events
    ];
    const list: EventOption[] = approvedEvents.map((name) => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    }));
    setEvents(list);

    // Load downloaded events
    (async () => {
      try {
        const keys = await listDownloadedEventSlugs();
        const flags: Record<string, boolean> = {};
        for (const k of keys) {
          flags[String(k)] = true;
        }
        setDownloaded(flags);
      } catch {
        /* ignore errors */
      }
    })();
  }, []);

  const handleDownloadEvent = async (evt: EventOption) => {
    setDownloading((prev) => ({ ...prev, [evt.slug]: true }));
    setStatus(`Downloading ${evt.name}...`);
    try {
      if (evt.name === "Codebusters") {
        // Special handling for Codebusters - download quotes
        const enResp = await fetch("/api/quotes?language=en&limit=200");
        const esResp = await fetch("/api/quotes?language=es&limit=200");
        // ... process quotes
      } else {
        // Download questions for other events
        const params = new URLSearchParams({ event: evt.name, limit: "1000" });
        const res = await fetch(`${api.questions}?${params.toString()}`);
        const data = await res.json();
        const questions = data?.data ?? [];
        await saveOfflineEvent(evt.slug, questions);
      }
      setDownloaded((prev) => ({ ...prev, [evt.slug]: true }));
      setStatus(`Downloaded ${evt.name}.`);
    } catch {
      setStatus(`Failed to download ${evt.name}.`);
    } finally {
      setDownloading((prev) => ({ ...prev, [evt.slug]: false }));
    }
  };
```

**Download Process:**
1. Fetches questions/quotes from API
2. Saves to IndexedDB using `saveOfflineEvent`
3. Tracks download status
4. Updates UI with download state

**Important Notes:**
- **Approved Events**: Only specific events are available for download
- **Codebusters Special**: Downloads quotes (English and Spanish) instead of questions
- **Question Limit**: Downloads up to 1000 questions per event
- **IndexedDB Storage**: Uses IndexedDB for offline storage
- **Download Tracking**: Tracks which events are downloaded
- **Status Updates**: Shows download progress and status

## Important Notes

1. **Offline Storage**: Uses IndexedDB via `saveOfflineEvent` utility
2. **Event Approval**: Only approved events can be downloaded
3. **Codebusters**: Special handling for Codebusters quotes
4. **Storage Management**: Users can download multiple events
5. **Offline Access**: Downloaded events available when offline
6. **Theme Support**: Dark/light mode support
