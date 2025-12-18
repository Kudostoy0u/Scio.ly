import { redirect } from "next/navigation";

// Fallback auth route to avoid 404s; direct users to the main sign-in flow.
export const dynamic = "force-dynamic";

export default function AuthIndexPage() {
	redirect("/");
}
