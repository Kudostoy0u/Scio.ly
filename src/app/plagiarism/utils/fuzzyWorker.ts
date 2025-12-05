export const createFuzzyMatchingWorker = (): Worker => {
	const workerCode = `
    function stringSimilarity(str1, str2) {
      if (str1 === str2) return 1;
      if (str1.length === 0 || str2.length === 0) return 0;
      const lengthDiff = Math.abs(str1.length - str2.length);
      const maxLength = Math.max(str1.length, str2.length);
      if (lengthDiff / maxLength > 0.7) return 0;
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      const editDistance = levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    }

    function levenshteinDistance(str1, str2) {
      const len1 = str1.length;
      const len2 = str2.length;
      if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.7) {
        return Math.max(len1, len2);
      }
      let prev = new Array(len2 + 1);
      let curr = new Array(len2 + 1);
      for (let j = 0; j <= len2; j++) {
        prev[j] = j;
      }
      for (let i = 1; i <= len1; i++) {
        curr[0] = i;
        for (let j = 1; j <= len2; j++) {
          if (str1[i - 1] === str2[j - 1]) {
            curr[j] = prev[j - 1];
          } else {
            curr[j] = Math.min(prev[j - 1] + 1, curr[j - 1] + 1, prev[j] + 1);
          }
        }
        [prev, curr] = [curr, prev];
      }
      return prev[len2];
    }

    self.onmessage = function(e) {
      const { inputQuestion, officialQuestions, questionIndex } = e.data;
      const questionMatches = [];
      const maxMatches = 5;
      for (const officialQuestion of officialQuestions) {
        const questionSimilarity = stringSimilarity(inputQuestion.question, officialQuestion.question);
        if (questionSimilarity > 0.3) {
          questionMatches.push({
            inputQuestion,
            matchedQuestion: officialQuestion,
            similarity: questionSimilarity,
            matchType: 'question'
          });
          if (questionMatches.length > maxMatches) {
            questionMatches.sort((a, b) => b.similarity - a.similarity);
            questionMatches.splice(maxMatches);
          }
        }
        if (questionMatches.length < maxMatches && inputQuestion.type === 'mcq' && inputQuestion.options && officialQuestion.options?.length > 0) {
          const inputOptionsText = inputQuestion.options.join(' ');
          const officialOptionsText = officialQuestion.options.join(' ');
          const optionsSimilarity = stringSimilarity(inputOptionsText, officialOptionsText);
          if (optionsSimilarity > 0.4) {
            questionMatches.push({
              inputQuestion,
              matchedQuestion: officialQuestion,
              similarity: optionsSimilarity,
              matchType: 'options'
            });
            if (questionMatches.length > maxMatches) {
              questionMatches.sort((a, b) => b.similarity - a.similarity);
              questionMatches.splice(maxMatches);
            }
          }
        }
      }
      questionMatches.sort((a, b) => b.similarity - a.similarity);
      const limitedMatches = questionMatches.slice(0, 5);
      const highRiskMatches = limitedMatches.filter(match => match.similarity >= 0.95);
      const mediumRiskMatches = limitedMatches.filter(match => match.similarity >= 0.85 && match.similarity < 0.95);
      const lowRiskMatches = limitedMatches.filter(match => match.similarity >= 0.40 && match.similarity < 0.85);
      const summary = {
        question: inputQuestion,
        questionIndex,
        matches: limitedMatches,
        highRiskMatches,
        mediumRiskMatches,
        lowRiskMatches,
        totalMatches: questionMatches.length,
        highestSimilarity: limitedMatches.length > 0 ? limitedMatches[0].similarity : 0
      };
      if (!summary.matches) summary.matches = [];
      if (!summary.highRiskMatches) summary.highRiskMatches = [];
      if (!summary.mediumRiskMatches) summary.mediumRiskMatches = [];
      if (!summary.lowRiskMatches) summary.lowRiskMatches = [];
      self.postMessage({ summary, questionIndex });
    };
  `;

	const blob = new Blob([workerCode], { type: "application/javascript" });
	return new Worker(URL.createObjectURL(blob));
};
