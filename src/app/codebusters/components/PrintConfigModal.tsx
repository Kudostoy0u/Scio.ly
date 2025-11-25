import type { QuoteData } from "@/app/codebusters/types";
import { resolveQuestionPoints } from "@/app/codebusters/utils/gradingUtils";
import { PrintConfigModal as SharedPrintConfigModal } from "@/app/components/PrintConfigModal";
import type React from "react";

interface PrintConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  quotes: QuoteData[];
  tournamentName: string;
  setTournamentName: (name: string) => void;
  questionPoints: { [key: number]: number };
  setQuestionPoints: (points: { [key: number]: number }) => void;
  darkMode: boolean;
}

const getCharCount = (quote: QuoteData) => {
  return quote.encrypted.replace(/[^A-Z]/g, "").length;
};

export const PrintConfigModal: React.FC<PrintConfigModalProps> = (props) => {
  return (
    <SharedPrintConfigModal
      {...props}
      items={props.quotes}
      title="Print Configuration"
      renderQuestionInfo={(quote) => {
        const charCount = getCharCount(quote);

        return {
          label: quote.cipherType,
          metadata: (
            <>
              <div>
                <span className={`${props.darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Characters:{" "}
                </span>
                <span className={`font-medium ${props.darkMode ? "text-white" : "text-gray-900"}`}>
                  {charCount}
                </span>
              </div>
              <div />
            </>
          ),
        };
      }}
      getEffectivePoints={(quote, index) => {
        return resolveQuestionPoints(quote, index, props.questionPoints);
      }}
    />
  );
};
