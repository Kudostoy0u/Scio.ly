export function parsePreviewParams(searchParams: URLSearchParams | null) {
  const isPreview = !!(searchParams && searchParams.get("preview") === "1");
  const previewScope = searchParams?.get("scope") || "all";
  const previewTeam = searchParams?.get("team") || "A";
  return { isPreview, previewScope, previewTeam };
}
