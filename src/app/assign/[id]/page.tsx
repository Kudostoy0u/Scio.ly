"use client";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import logger from "@/lib/utils/logger";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  useEffect(() => {
    const go = async () => {
      const idStr = params?.id as string | undefined;
      if (!idStr) {
        return;
      }
      try {
        logger.log("[assign] fetching assignment", { idStr });
        const res = await fetch(`/api/assignments?id=${encodeURIComponent(idStr)}`, {
          cache: "no-store",
        });
        const j = await res.json();
        logger.log("[assign] api response", { ok: res.ok, status: res.status, data: j?.data });
        const row = j?.data;
        if (!row) {
          logger.warn("[assign] missing assignment");
          router.replace("/assign/error");
          return;
        }
        const eventName: string | undefined = row?.event_name;
        const paramsObj = row?.params || {};
        const questions = Array.isArray(row?.questions) ? row.questions : [];
        try {
          SyncLocalStorage.setItem("currentAssignmentId", String(idStr));
          SyncLocalStorage.setItem("testParams", JSON.stringify({ ...paramsObj, eventName }));
          document.cookie = `scio_test_params=${encodeURIComponent(JSON.stringify({ ...paramsObj, eventName }))}; Path=/; Max-Age=600; SameSite=Lax`;
          // Ensure /teams/results can resolve team context without query
          try {
            const sel = { school: row.school, division: row.division, captain: false };
            SyncLocalStorage.setItem("teamsSelection", JSON.stringify(sel));
            logger.log("[assign] set teamsSelection", sel);
          } catch {}
          // Seed exact questions for the assignee
          if (eventName === "Codebusters") {
            logger.log("[assign] seeding codebusters quotes", { count: questions.length });
            try {
              SyncLocalStorage.setItem("codebustersQuotes", JSON.stringify(questions));
              SyncLocalStorage.setItem("codebustersQuotesLoadedFromStorage", "true");
              SyncLocalStorage.removeItem("codebustersIsTestSubmitted");
              SyncLocalStorage.removeItem("codebustersTestScore");
              SyncLocalStorage.removeItem("codebustersTimeLeft");
            } catch {}
          } else {
            logger.log("[assign] seeding test questions", { count: questions.length });
            try {
              // strip any originalIndex and reindex freshly
              const seeded = questions.map((q: any, idx: number) => ({ ...q, originalIndex: idx }));
              SyncLocalStorage.setItem("testQuestions", JSON.stringify(seeded));
              SyncLocalStorage.removeItem("testUserAnswers");
              SyncLocalStorage.removeItem("testGradingResults");
            } catch {}
          }
        } catch {}
        const isCodebusters = eventName === "Codebusters";
        const route = isCodebusters ? "/codebusters" : "/test";
        const sp = new URLSearchParams();
        // Assignee should take a normal test (no preview)
        sp.set("teamsAssign", "1");
        if (row.team_id) {
          sp.set("team", row.team_id);
        }
        if (row.school) {
          sp.set("school", row.school);
        }
        if (row.division) {
          sp.set("division", row.division);
        }
        const target = `${route}?${sp.toString()}`;
        logger.log("[assign] redirecting to", target);
        router.replace(target);
      } catch {
        router.replace("/assign/error");
      }
    };
    void go();
  }, [params?.id, router]);

  return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
}
