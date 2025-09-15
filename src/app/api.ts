
const API_BASE_URL = '/api'
const api = {
    baseUrl: API_BASE_URL,
    questions: `${API_BASE_URL}/questions`,
    questionsBatch: `${API_BASE_URL}/questions/batch`,
    events: `${API_BASE_URL}/meta/events`,
    tournaments: `${API_BASE_URL}/meta/tournaments`,
    subtopics: `${API_BASE_URL}/meta/subtopics`,
    stats: `${API_BASE_URL}/meta/stats`,
    

    blacklists: `${API_BASE_URL}/blacklists`,
    edits: `${API_BASE_URL}/edits`,
    share: `${API_BASE_URL}/share`,
    shareGenerate: `${API_BASE_URL}/share/generate`,
    codebustersShare: `${API_BASE_URL}/codebusters/share`,
    codebustersShareGenerate: `${API_BASE_URL}/codebusters/share/generate`,
    idQuestions: `${API_BASE_URL}/id-questions`,
    reportEdit: `${API_BASE_URL}/report/edit`,
    reportRemove: `${API_BASE_URL}/report/remove`,
    reportAll: `${API_BASE_URL}/report/all`,
    reportMeta: `${API_BASE_URL}/report/meta`,
    admin: `${API_BASE_URL}/admin`,
    

    geminiSuggestEdit: `${API_BASE_URL}/gemini/suggest-edit`,
    geminiAnalyzeQuestion: `${API_BASE_URL}/gemini/analyze-question`,
    geminiImproveReason: `${API_BASE_URL}/gemini/improve-reason`,
    geminiValidateEdit: `${API_BASE_URL}/gemini/validate-edit`,
    geminiExplain: `${API_BASE_URL}/gemini/explain`,
    geminiGradeFreeResponses: `${API_BASE_URL}/gemini/grade-free-responses`,
    geminiExtractQuestions: `${API_BASE_URL}/gemini/extract-questions`,
    processPdf: `${API_BASE_URL}/process-pdf`,
    uploadImage: `${API_BASE_URL}/upload-image`,
    
    arr: JSON.parse(process.env.NEXT_PUBLIC_API_KEYS || "[]"),

    api: `${API_BASE_URL}/questions`
};

export default api;


