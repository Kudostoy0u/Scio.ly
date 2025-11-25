"use client";
import { useTheme } from "@/app/contexts/themeContext";
import { DocsMarkdown } from "@/app/docs/components/DocsMarkdown";
import { getEventBySlug } from "@/app/docs/utils/events2026";
import type { DocsEvent } from "@/app/docs/utils/events2026";
import { getEventMarkdown } from "@/app/docs/utils/storageClient";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type DocsSubsection = NonNullable<DocsEvent["subsections"]>[number];

export default function EditSubsectionDocsPage() {
  const { darkMode } = useTheme();
  const { event, sub } = useParams<{ event: string; sub: string }>();
  const router = useRouter();
  const { evt, subsection } = useSubsectionInfo(event, sub);
  const { md, setMd, loading } = useSubsectionMarkdown(evt, subsection);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [message, setMessage] = useState<string | null>(null);
  const [saving] = useState(false);

  const onSave = useCallback(async () => {
    try {
      const { toast } = await import("react-toastify");
      toast.info("Editing is temporarily disabled.");
    } catch {
      setMessage("Editing is temporarily disabled.");
    }
  }, []);

  if (!(evt && subsection)) {
    return null;
  }

  return (
    <div className="pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <EditorHeader
          darkMode={darkMode}
          evtName={evt.name}
          subsectionTitle={subsection.title}
          tab={tab}
          onTabChange={setTab}
          onSave={onSave}
          saving={saving}
          onBack={() => router.push(`/docs/${evt.slug}/${subsection.slug}`)}
        />
        {message && (
          <p className={`text-sm mb-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            {message}
          </p>
        )}
        <EditorContent
          darkMode={darkMode}
          loading={loading}
          tab={tab}
          md={md}
          onChange={(value) => setMd(value)}
        />
      </div>
    </div>
  );
}

function useSubsectionInfo(event?: string, sub?: string) {
  const evt = useMemo(() => getEventBySlug(event ?? ""), [event]);
  const subsection = useMemo(() => {
    return evt?.subsections?.find((s) => s.slug === (sub ?? ""));
  }, [evt, sub]);
  return { evt, subsection };
}

function useSubsectionMarkdown(evt: DocsEvent | undefined, subsection: DocsSubsection | undefined) {
  const [md, setMd] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!(evt && subsection)) {
        return;
      }
      const slug = `${evt.slug}/${subsection.slug}`;
      const existing = await getEventMarkdown(slug);
      if (!mounted) {
        return;
      }
      const starter = `# ${evt.name} – ${subsection.title} (2026)\n\n## Overview\n\nStart the outline for this subsection here.\n`;
      setMd(existing ?? starter);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [evt, subsection]);

  return { md, setMd, loading };
}

function EditorHeader({
  darkMode,
  evtName,
  subsectionTitle,
  tab,
  onTabChange,
  onSave,
  saving,
  onBack,
}: {
  darkMode: boolean;
  evtName: string;
  subsectionTitle: string;
  tab: "edit" | "preview";
  onTabChange: (tab: "edit" | "preview") => void;
  onSave: () => void;
  saving: boolean;
  onBack: () => void;
}) {
  const tabButtonClass = (isActive: boolean) =>
    `px-3 py-1 rounded border ${
      darkMode ? "border-gray-700" : "border-gray-300"
    } ${isActive ? (darkMode ? "bg-gray-800" : "bg-gray-100") : ""} ${
      darkMode ? "text-gray-100" : "text-gray-900"
    }`;

  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className={`text-2xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>
        Edit Docs – {evtName} / {subsectionTitle}
      </h1>
      <div className="flex gap-2">
        <button
          type="button"
          className={tabButtonClass(tab === "edit")}
          onClick={() => onTabChange("edit")}
        >
          Edit
        </button>
        <button
          type="button"
          className={tabButtonClass(tab === "preview")}
          onClick={() => onTabChange("preview")}
        >
          Preview
        </button>
        <button
          type="button"
          className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded border ${darkMode ? "border-gray-700 text-gray-100" : "border-gray-300 text-gray-900"}`}
          onClick={onBack}
        >
          Back
        </button>
      </div>
    </div>
  );
}

function EditorContent({
  darkMode,
  loading,
  tab,
  md,
  onChange,
}: {
  darkMode: boolean;
  loading: boolean;
  tab: "edit" | "preview";
  md: string;
  onChange: (value: string) => void;
}) {
  if (loading) {
    return <p className={darkMode ? "text-gray-300" : "text-gray-700"}>Loading…</p>;
  }

  if (tab === "preview") {
    return (
      <div className={`border rounded p-4 ${darkMode ? "border-gray-800" : "border-gray-200"}`}>
        <DocsMarkdown content={md} />
      </div>
    );
  }

  return (
    <textarea
      className={`w-full h-[70vh] border rounded p-3 font-mono text-sm ${
        darkMode
          ? "border-gray-700 bg-gray-900 text-gray-100"
          : "border-gray-300 bg-white text-gray-900"
      }`}
      value={md}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
