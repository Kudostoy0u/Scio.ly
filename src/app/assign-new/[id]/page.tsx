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
        logger.log("[assign-new] fetching assignment", { idStr });

        // Use the new API endpoint that returns data in the old format
        const res = await fetch(`/api/assignments-new/${idStr}`, { cache: "no-store" });
        const j = await res.json();
        logger.log("[assign-new] api response", {
          ok: res.ok,
          status: res.status,
          data: j?.assignment,
        });
        const assignment = j?.assignment;
        if (!assignment) {
          logger.warn("[assign-new] missing assignment");
          router.replace("/assign/error");
          return;
        }

        const eventName: string | undefined = assignment.event_name || "Assignment";
        const questions = Array.isArray(assignment.questions) ? assignment.questions : [];

        try {
          SyncLocalStorage.setItem("currentAssignmentId", String(idStr));
          SyncLocalStorage.setItem("testParams", JSON.stringify({ eventName }));
          document.cookie = `scio_test_params=${encodeURIComponent(JSON.stringify({ eventName }))}; Path=/; Max-Age=600; SameSite=Lax`;

          // Ensure /teams/results can resolve team context without query
          try {
            const sel = {
              school: assignment.school,
              division: assignment.division,
              captain: false,
            };
            SyncLocalStorage.setItem("teamsSelection", JSON.stringify(sel));
            logger.log("[assign-new] set teamsSelection", sel);
          } catch {}

          // Seed exact questions for the assignee
          if (eventName === "Codebusters") {
            logger.log("[assign-new] seeding codebusters quotes", { count: questions.length });
            try {
              SyncLocalStorage.setItem("codebustersQuotes", JSON.stringify(questions));
              SyncLocalStorage.setItem("codebustersQuotesLoadedFromStorage", "true");
              SyncLocalStorage.removeItem("codebustersIsTestSubmitted");
              SyncLocalStorage.removeItem("codebustersTestScore");
              SyncLocalStorage.removeItem("codebustersTimeLeft");
            } catch {}
          } else {
            logger.log("[assign-new] seeding test questions", { count: questions.length });
            try {
              // Questions are already in the correct format from the API
              // Just strip any originalIndex and reindex freshly
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
        sp.set("assignmentId", idStr); // Include the assignment ID
        if (assignment.team_id) {
          sp.set("team", assignment.team_id);
        }
        if (assignment.school) {
          sp.set("school", assignment.school);
        }
        if (assignment.division) {
          sp.set("division", assignment.division);
        }
        const target = `${route}?${sp.toString()}`;
        logger.log("[assign-new] redirecting to", target);
        router.replace(target);
      } catch (error) {
        logger.error("[assign-new] error:", error);
        router.replace("/assign/error");
      }
    };
    void go();
  }, [params?.id, router]);

  return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
}
