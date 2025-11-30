# Bot Directory

This directory contains the Discord bot documentation page for Hylas, the Scio.ly Discord bot.

## Files

### `page.tsx`
Client component that displays Discord bot documentation and commands.

**Key Features:**
- Bot command documentation
- Division and subtopic reference tables
- Discord bot invite link
- Command usage examples

**Example:**
```431:540:src/app/bot/page.tsx
export default function DocsPage() {
  const { darkMode } = useTheme();
  const [mounted] = useState(() => {
    if (typeof window !== "undefined") {
      return true;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark-scrollbar", darkMode);
    document.documentElement.classList.toggle("light-scrollbar", !darkMode);
  }, [darkMode]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Header />
      <main className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8 w-full">
        <div className="p-8 rounded-xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Scio.ly Bot (Hylas, the Cat) Documentation
            </h1>
            <a
              href="https://discord.com/oauth2/authorize?client_id=1400979720614711327&permissions=8&integration_type=0&scope=bot+applications.commands"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
            >
              Click here to add to server
            </a>
          </div>
          {/* Commands and tables */}
        </div>
      </main>
    </div>
  );
}
```

**Bot Commands:**
- `/mcq [event name] [division] [difficulty] [subtopic]` - Sends a multiple choice question
- `/frq [event name] [division] [difficulty] [subtopic]` - Sends a free response question
- `/check [question_id] [answer]` - Check your answer to a question
- `/explain [question_id]` - Get an AI-generated explanation for a question

**Division & Subtopic Tables:**
- Shows which divisions (B/C) are available for each event
- Lists subtopics for each event
- Indicates which combinations are valid (green cells)

**Important Notes:**
- **Discord Bot**: Documentation for Hylas Discord bot
- **Bot Developer**: Matthew (Discord: mat_thew0812)
- **API Source**: Bot uses Scio.ly API for questions
- **Theme Support**: Dark/light mode support
- **Hydration Safety**: Uses mounted state to prevent hydration mismatches
