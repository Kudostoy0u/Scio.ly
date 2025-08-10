// Using migrated TypeScript Next.js API routes
const API_BASE_URL = '/api'
const api = {
    baseUrl: API_BASE_URL,
    questions: `${API_BASE_URL}/questions`,
    questionsBatch: `${API_BASE_URL}/questions/batch`,
    events: `${API_BASE_URL}/meta/events`,
    tournaments: `${API_BASE_URL}/meta/tournaments`,
    subtopics: `${API_BASE_URL}/meta/subtopics`,
    stats: `${API_BASE_URL}/meta/stats`,
    
    // New endpoints for migrated functionality
    blacklists: `${API_BASE_URL}/blacklists`,
    edits: `${API_BASE_URL}/edits`,
    share: `${API_BASE_URL}/share`,
    shareGenerate: `${API_BASE_URL}/share/generate`,
    codebustersShare: `${API_BASE_URL}/codebusters/share`,
    codebustersShareGenerate: `${API_BASE_URL}/codebusters/share/generate`,
    reportEdit: `${API_BASE_URL}/report/edit`,
    reportRemove: `${API_BASE_URL}/report/remove`,
    reportAll: `${API_BASE_URL}/report/all`,
    
    // Gemini AI endpoints
    geminiSuggestEdit: `${API_BASE_URL}/gemini/suggest-edit`,
    geminiAnalyzeQuestion: `${API_BASE_URL}/gemini/analyze-question`,
    geminiImproveReason: `${API_BASE_URL}/gemini/improve-reason`,
    geminiValidateEdit: `${API_BASE_URL}/gemini/validate-edit`,
    geminiExplain: `${API_BASE_URL}/gemini/explain`,
    geminiGradeFreeResponses: `${API_BASE_URL}/gemini/grade-free-responses`,
    geminiExtractQuestions: `${API_BASE_URL}/gemini/extract-questions`,
    processPdf: `${API_BASE_URL}/process-pdf`,
    rocksRandom: `${API_BASE_URL}/rocks/random`,
    
    arr: JSON.parse(process.env.NEXT_PUBLIC_API_KEYS || "[]"),
    // Legacy support - keep for backward compatibility
    api: `${API_BASE_URL}/questions`
};

export default api;


