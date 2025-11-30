# Certified Directory

This directory contains the certified tournaments page for the Scio.ly platform. Displays tournaments that have been certified for use on the platform.

## Files

### `page.tsx`
Client component that displays certified tournaments.

**Key Features:**
- Lists manually certified tournaments
- Lists public and certified tournaments
- Tournament display with trophy icons
- Theme-aware styling

**Example:**
```7:64:src/app/certified/page.tsx
export default function CertifiedPage() {
  const { darkMode } = useTheme();

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <Header />
      <main className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <section className="border rounded-xl shadow-sm p-6 md:p-8">
            <h1 className="text-3xl font-bold mb-3">Certified Tournaments</h1>
            <p className="mb-2">
              Here are the certified tournaments from which we pull test questions. They have been
              vetted by our team and upserted into our database needing any AI enhancements.
            </p>
            <p className="mb-2">
              Specifically, this list contains all tournaments that granted permission for use of
              their questions or are marked public on the test exchange and meet our quality
              standards.
            </p>

            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-1">Manually certified</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {MANUAL_TOURNAMENTS.map((name) => (
                  <div key={name} className="border rounded-md px-4 py-2 flex items-center gap-3">
                    <Trophy className="w-4 h-4" />
                    <span className="font-medium">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-1">Public and certified tournaments</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PUBLIC_TOURNAMENTS.map((name) => (
                  <div key={name} className="border rounded-md px-4 py-2 flex items-center gap-3">
                    <Trophy className="w-4 h-4" />
                    <span className="font-medium">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
```

**Tournament Categories:**
- **Manually Certified**: Tournaments provided by organizers or curated by Scio.ly team
- **Public and Certified**: Tournaments marked as public on test exchange and meeting quality standards

**Tournament Lists:**
- `MANUAL_TOURNAMENTS`: Array of manually certified tournament names
- `PUBLIC_TOURNAMENTS`: Array of public certified tournament names

**Important Notes:**
- **Quality Standards**: All tournaments meet Scio.ly quality standards
- **Permission**: Tournaments have granted permission or are marked public
- **AI Enhancement**: Questions from these tournaments may have AI enhancements
- **Display**: Responsive grid layout for tournament display
- **Theme Support**: Dark/light mode support
