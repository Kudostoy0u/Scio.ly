"use client";
import logger from "@/lib/utils/logger";

import api from "@/app/api";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import AnalysisList from "./components/AnalysisList";
import { PlagiarismModal } from "./components/PlagiarismModal";
import SetupPanel from "./components/SetupPanel";
import type {
  OfficialQuestion,
  PlagiarismMatch,
  ProcessedQuestions,
  QuestionPlagiarismSummary,
} from "./types";
import { createFuzzyMatchingWorker } from "./utils/fuzzyWorker";

// types moved to ./types

// removed legacy modal (use PlagiarismModal component)

// removed legacy question item (use QuestionItem component)

// moved to ./constants

export default function PlagiarismPage() {
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [status, setStatus] = useState<string>("Select an event and add content to begin analysis");
  const [inputText, setInputText] = useState<string>("");
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "error" | "loaded">("idle");
  const [extractedQuestions, setExtractedQuestions] = useState<ProcessedQuestions | null>(null);
  const [officialQuestions, setOfficialQuestions] = useState<OfficialQuestion[]>([]);
  const [questionSummaries, setQuestionSummaries] = useState<QuestionPlagiarismSummary[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    summary: QuestionPlagiarismSummary | null;
  }>({
    isOpen: false,
    summary: null,
  });
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  const [lastInputHash, setLastInputHash] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerActive, setIsWorkerActive] = useState(false);
  const analysisScrollRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const questionSummariesRef = useRef<QuestionPlagiarismSummary[]>([]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      analysisScrollRef.current &&
      scrollPositionRef.current > 0 &&
      questionSummaries.length > 0
    ) {
      analysisScrollRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [questionSummaries]);

  const handleScroll = useCallback(() => {
    if (analysisScrollRef.current) {
      scrollPositionRef.current = analysisScrollRef.current.scrollTop;
    }
  }, []);

  const checkInputChange = useCallback(
    (newInput: string) => {
      const newHash =
        newInput.length.toString() +
        newInput
          .slice(0, 50)
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase();
      if (newHash !== lastInputHash) {
        setLastInputHash(newHash);
        setIsAnalyzing(false);
        setHasAnalyzed(false);
        setQuestionSummaries([]);
        setExtractedQuestions(null);
      }
    },
    [lastInputHash]
  );

  const handleOpenModal = useCallback((summary: QuestionPlagiarismSummary) => {
    setModalData({ isOpen: true, summary });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalData({ isOpen: false, summary: null });
  }, []);

  const handleLoadData = useCallback(
    async (event?: string) => {
      const eventToLoad = event || selectedEvent;
      if (!eventToLoad) {
        setStatus("Please select an event first");
        setLoadingState("idle");
        return;
      }

      setStatus(`Fetching official questions for ${eventToLoad}...`);
      setLoadingState("loading");
      setIsDataLoaded(false);

      try {
        const response = await fetch(
          `${api.questions}?event=${encodeURIComponent(eventToLoad)}&limit=50000`
        );
        const data = await response.json();

        if (data.success && data.data) {
          setOfficialQuestions(data.data);
          setStatus(
            `Data loaded successfully! Found ${data.data.length} official questions for ${eventToLoad}.`
          );
          setLoadingState("loaded");
          setIsDataLoaded(true);
        } else {
          setStatus("No questions found for this event");
          setLoadingState("error");
          setIsDataLoaded(false);
        }
      } catch (error) {
        setStatus(`Error: ${(error as Error).message}`);
        setLoadingState("error");
        setIsDataLoaded(false);
      }
    },
    [selectedEvent]
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      setSelectedFile(file);
      setStatus("Processing document...");
      setLoadingState("loading");

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const result = reader.result as string;
            if (result?.includes(",")) {
              const base64 = result.split(",")[1];
              resolve(base64 || "");
            } else {
              reject(new Error("Failed to convert file to base64."));
            }
          };
          reader.onerror = (error) => reject(error);
        });

        const response = await fetch(api.processPdf, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pdfData: base64,
            filename: file.name,
          }),
        });

        const data = await response.json();

        if (data.success) {
          const newText = inputText ? `${inputText}\n\n${data.text}` : data.text;
          setInputText(newText);
          checkInputChange(newText);
          setStatus("Document processed successfully.");
          setLoadingState("loaded");
        } else {
          setStatus(`Error processing document: ${data.error}`);
          setLoadingState("error");
        }
      } catch (error) {
        setStatus(`Error processing document: ${(error as Error).message}`);
        setLoadingState("error");
      }
    },
    [inputText, checkInputChange]
  );

  const handlePlagiarismAnalysis = useCallback(async () => {
    if (!(inputText.trim() && isDataLoaded)) {
      setStatus("Please provide text and load official data first");
      return;
    }

    setStatus("Step 1: Extracting questions...");
    setLoadingState("loading");

    try {
      const extractResponse = await fetch(api.geminiExtractQuestions, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
        }),
      });

      const extractData = await extractResponse.json();

      if (!extractData.success) {
        setStatus(`Error extracting questions: ${extractData.error}`);
        setLoadingState("error");
        return;
      }

      const extractedQuestions = { questions: extractData.data.questions };
      setExtractedQuestions(extractedQuestions);
      setStatus("Step 2: Starting background analysis...");

      const allMatches: PlagiarismMatch[] = [];
      let completedQuestions = 0;

      questionSummariesRef.current = new Array(extractedQuestions.questions.length);

      if (!workerRef.current) {
        workerRef.current = createFuzzyMatchingWorker();
      }

      setIsWorkerActive(true);
      setIsAnalyzing(true);

      const handleWorkerMessage = (event: MessageEvent) => {
        const { summary, questionIndex } = event.data;

        if (!summary || typeof summary.questionIndex !== "number") {
          logger.warn("Invalid summary received from worker:", summary);
          return;
        }

        const validSummary = {
          ...summary,
          matches: summary.matches || [],
          highRiskMatches: summary.highRiskMatches || [],
          mediumRiskMatches: summary.mediumRiskMatches || [],
          lowRiskMatches: summary.lowRiskMatches || [],
          totalMatches: summary.totalMatches || 0,
          highestSimilarity: summary.highestSimilarity || 0,
        };

        questionSummariesRef.current[questionIndex] = validSummary;

        const shouldUpdate =
          questionIndex === questionSummariesRef.current.length - 1 ||
          (questionIndex + 1) % 10 === 0;

        if (shouldUpdate) {
          setQuestionSummaries([...questionSummariesRef.current]);
        }

        allMatches.push(...validSummary.matches);

        completedQuestions++;
        setStatus(
          `Step 2: Analyzing ${completedQuestions}/${extractedQuestions.questions.length} questions...`
        );

        if (completedQuestions === extractedQuestions.questions.length) {
          allMatches.sort((a, b) => b.similarity - a.similarity);

          setQuestionSummaries([...questionSummariesRef.current]);
          setStatus(
            `Analysis completed! Found ${allMatches.length} potential matches across ${extractedQuestions.questions.length} questions.`
          );
          setLoadingState("loaded");
          setIsWorkerActive(false);
          setIsAnalyzing(false);
          setHasAnalyzed(true);

          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        }
      };

      workerRef.current.onmessage = handleWorkerMessage;

      for (
        let questionIndex = 0;
        questionIndex < extractedQuestions.questions.length;
        questionIndex++
      ) {
        const inputQuestion = extractedQuestions.questions[questionIndex];

        workerRef.current.postMessage({
          inputQuestion,
          officialQuestions,
          questionIndex,
        });

        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
      setLoadingState("error");
      setIsWorkerActive(false);
      setIsAnalyzing(false);

      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    }
  }, [inputText, isDataLoaded, officialQuestions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Science Olympiad Plagiarism Checker
          </h1>
          <p className="text-slate-600">
            Check your test questions against our database of tournaments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SetupPanel
            selectedEvent={selectedEvent}
            onEventChange={async (event) => {
              setSelectedEvent(event);
              if (event) {
                await handleLoadData(event);
              }
            }}
            inputText={inputText}
            onTextChange={(text) => {
              setInputText(text);
              checkInputChange(text);
            }}
            fileInputRef={fileInputRef}
            selectedFile={selectedFile}
            onFileUpload={handleFileUpload}
            onCheck={handlePlagiarismAnalysis}
            isDataLoaded={isDataLoaded}
            isAnalyzing={isAnalyzing}
            hasAnalyzed={hasAnalyzed}
            loadingState={loadingState}
            status={status}
            extractedQuestions={extractedQuestions}
            questionSummaries={questionSummaries}
            isWorkerActive={isWorkerActive}
          />

          <div className="space-y-6">
            <AnalysisList
              extractedQuestions={extractedQuestions}
              questionSummaries={questionSummaries}
              onOpenModal={handleOpenModal}
              analysisScrollRef={analysisScrollRef}
              onScroll={handleScroll}
            />
          </div>
        </div>
      </div>

      {/* Modal */}
      <PlagiarismModal
        isOpen={modalData.isOpen}
        onClose={handleCloseModal}
        summary={modalData.summary}
      />
    </div>
  );
}
