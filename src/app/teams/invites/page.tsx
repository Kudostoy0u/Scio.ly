"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function InvitesPage() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/my", { cache: "no-store" });
      const json = await res.json();
      if (json?.success) {
        setInvites(json.data || []);
      } else {
        setError(json?.error || "Failed to load invites");
      }
    } catch {
      setError("Failed to load invites");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (id: number) => {
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId: id }),
      });
      if (res.ok) {
        window.location.href = "/teams";
      }
    } catch {}
  };

  const decline = async (id: number) => {
    try {
      await fetch("/api/invites/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId: id }),
      });
      load();
    } catch {}
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Team Invites</h1>
        <Link href="/teams" className="text-blue-600 hover:text-blue-700">
          Back to Teams
        </Link>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : invites.length === 0 ? (
        <div className="text-gray-600">No pending invites.</div>
      ) : (
        <div className="space-y-3">
          {invites.map((inv) => (
            <div key={inv.id} className="border rounded p-3">
              <div className="font-medium">
                {inv.school} — Division {inv.division}, Team {inv.team_id}
              </div>
              <div className="text-sm text-gray-600">
                Invited by {inv.inviter_user_id} on {new Date(inv.created_at).toLocaleString()}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => accept(inv.id)}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  Accept
                </button>
                <button
                  onClick={() => decline(inv.id)}
                  className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
