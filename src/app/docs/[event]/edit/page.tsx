"use client";
import { useTheme } from "@/app/contexts/ThemeContext";
import { DocsMarkdown } from "@/app/docs/components/DocsMarkdown";
import { getEventBySlug } from "@/app/docs/utils/events2026";
import { getEventMarkdown } from "@/app/docs/utils/storageClient";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const starter = (name: string) => `# ${name} (2026)

## Overview

Provide a concise summary of this event, key skills, and what to expect on test day.

## Key Topics

- Topic 1
- Topic 2
- Topic 3

## Study Roadmap

1. Read official rules
2. Build a reference/notesheet (if allowed)
3. Drill practice problems and past tests

## Allowed Materials

Summarize what you can bring (notesheet, binder, calculator). Verify in official rules.

## Curated Resources

- SciOly Wiki: 
- Practice sets: 
- Videos: 
`;

export default function EditEventDocsPage() {
  const { darkMode } = useTheme();
  const { event } = useParams<{ event: string }>();
  const router = useRouter();
  const evt = useMemo(() => getEventBySlug(event as string), [event]);
  const [md, setMd] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!evt) {
        return;
      }
      const existing = await getEventMarkdown(evt.slug);
      if (!mounted) {
        return;
      }
      setMd(existing ?? starter(evt.name));
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [evt]);

  if (!evt) {
    return null;
  }

  async function onSave() {
    try {
      const { toast } = await import("react-toastify");
      toast.info("Editing is temporarily disabled.");
    } catch {
      setMessage("Editing is temporarily disabled.");
    }
  }

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className={`text-2xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
            Edit Docs – {evt.name}
          </h1>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded border ${darkMode ? "border-gray-700" : "border-gray-300"} ${tab === "edit" ? (darkMode ? "bg-gray-800" : "bg-gray-100") : ""} ${darkMode ? "text-gray-100" : "text-gray-900"}`}
              onClick={() => setTab("edit")}
            >
              Edit
            </button>
            <button
              className={`px-3 py-1 rounded border ${darkMode ? "border-gray-700" : "border-gray-300"} ${tab === "preview" ? (darkMode ? "bg-gray-800" : "bg-gray-100") : ""} ${darkMode ? "text-gray-100" : "text-gray-900"}`}
              onClick={() => setTab("preview")}
            >
              Preview
            </button>
            <button
              className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className={`px-3 py-1 rounded border ${darkMode ? "border-gray-700 text-gray-100" : "border-gray-300 text-gray-900"}`}
              onClick={() => router.push(`/docs/${evt.slug}`)}
            >
              Back
            </button>
          </div>
        </div>
        {message && (
          <p className={`text-sm mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{message}</p>
        )}
        {loading ? (
          <p className={darkMode ? "text-gray-300" : "text-gray-700"}>Loading…</p>
        ) : tab === "edit" ? (
          <textarea
            className={`w-full h-[70vh] border rounded p-3 font-mono text-sm ${darkMode ? "border-gray-700 bg-gray-900 text-gray-100" : "border-gray-300 bg-white text-gray-900"}`}
            value={md}
            onChange={(e) => setMd(e.target.value)}
          />
        ) : (
          <div className={`border rounded p-4 ${darkMode ? "border-gray-800" : "border-gray-200"}`}>
            <DocsMarkdown content={md} />
          </div>
        )}
      </div>
    </div>
  );
}
