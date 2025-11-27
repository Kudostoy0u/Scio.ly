import type { Settings } from "@/app/practice/types";
import { NORMAL_DEFAULTS } from "@/app/practice/utils";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { useEffect, useState } from "react";

export function usePracticeSettings() {
  const [settings, setSettings] = useState<Settings>({
    questionCount: NORMAL_DEFAULTS.questionCount,
    timeLimit: NORMAL_DEFAULTS.timeLimit,
    difficulties: [],
    types: "multiple-choice",
    division: "any",
    tournament: "",
    subtopics: [],
    idPercentage: 0,
    pureIdOnly: false,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedQuestionCount = SyncLocalStorage.getItem("defaultQuestionCount");
      const storedTimeLimit = SyncLocalStorage.getItem("defaultTimeLimit");
      const storedDivision = SyncLocalStorage.getItem("defaultDivision") || "any";
      const storedQuestionTypes =
        SyncLocalStorage.getItem("defaultQuestionTypes") || "multiple-choice";
      const storedIdPercentage = SyncLocalStorage.getItem("defaultIdPercentage");
      const storedPureIdOnly = SyncLocalStorage.getItem("defaultPureIdOnly");
      const storedCharLengthMin = SyncLocalStorage.getItem("codebustersCharLengthMin");
      const storedCharLengthMax = SyncLocalStorage.getItem("codebustersCharLengthMax");

      const questionCount = storedQuestionCount
        ? Number.parseInt(storedQuestionCount)
        : NORMAL_DEFAULTS.questionCount;
      const timeLimit = storedTimeLimit
        ? Number.parseInt(storedTimeLimit)
        : NORMAL_DEFAULTS.timeLimit;
      const idPercentage = storedIdPercentage ? Number.parseInt(storedIdPercentage) : 0;
      const pureIdOnly = storedPureIdOnly === "true";
      const charLengthMin = storedCharLengthMin ? Number.parseInt(storedCharLengthMin) : 1;
      const charLengthMax = storedCharLengthMax ? Number.parseInt(storedCharLengthMax) : 100;

      setSettings((prev: Settings) => ({
        ...prev,
        questionCount: Number.isNaN(questionCount) ? NORMAL_DEFAULTS.questionCount : questionCount,
        timeLimit: Number.isNaN(timeLimit) ? NORMAL_DEFAULTS.timeLimit : timeLimit,
        division:
          storedDivision === "B" || storedDivision === "C" || storedDivision === "any"
            ? storedDivision
            : "any",
        types:
          storedQuestionTypes === "multiple-choice" ||
          storedQuestionTypes === "both" ||
          storedQuestionTypes === "free-response"
            ? storedQuestionTypes
            : "multiple-choice",
        idPercentage: Number.isNaN(idPercentage) ? 0 : idPercentage,
        pureIdOnly: pureIdOnly,
        charLengthMin: Number.isNaN(charLengthMin) ? 1 : charLengthMin,
        charLengthMax: Number.isNaN(charLengthMax) ? 100 : charLengthMax,
      }));
    }
  }, []);

  return [settings, setSettings] as const;
}
