import { NextResponse } from 'next/server';

// GET /api/docs - API Documentation
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Science Olympiad API Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        h1 { border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-top: 30px; }
        .endpoint { background: #f4f4f4; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .method { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 3px; 
            color: white; 
            font-weight: bold; 
            margin-right: 10px;
        }
        .get { background: #4CAF50; }
        .post { background: #2196F3; }
        .put { background: #FF9800; }
        .delete { background: #f44336; }
        .url { font-family: monospace; font-weight: bold; }
        .description { margin-top: 5px; color: #666; }
        .params { margin-top: 10px; }
        .param { margin: 5px 0; }
        .param-name { font-weight: bold; color: #333; }
        .param-type { color: #666; font-style: italic; }
        .example { background: #e8f5e8; padding: 10px; border-radius: 3px; margin-top: 10px; }
        .feature-tag { 
            display: inline-block; 
            background: #e1f5fe; 
            color: #0277bd; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-size: 0.8em; 
            margin-left: 10px;
        }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .info-box { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 10px; margin: 15px 0; }
    </style>
</head>
<body>
    <h1>🧪 Science Olympiad API Documentation</h1>
    
    <div class="info-box">
        <strong>Base URL:</strong> <code>http://scioly-api.vercel.app</code><br>
        <strong>Version:</strong> 1.0.0<br>
        <strong>Description:</strong> Comprehensive API for Science Olympiad question management, AI-powered features, and collaborative testing<br>
        <strong>Question Types:</strong> Questions can be filtered by type - "mcq" for multiple choice questions with options, "frq" for free response questions without options
    </div>

    <h2>🔍 Core Question Management</h2>
    
    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/questions</span>
        <span class="feature-tag">Filtering</span>
        <span class="feature-tag">Question Types</span>
        <div class="description">Retrieve questions with advanced filtering. Returns all matching questions without pagination.</div>
        <div class="params">
            <strong>Query Parameters:</strong><br>
            <div class="param"><span class="param-name">event</span> <span class="param-type">(string)</span> - Filter by event name</div>
            <div class="param"><span class="param-name">division</span> <span class="param-type">(string)</span> - Filter by division (B, C, B/C)</div>
            <div class="param"><span class="param-name">tournament</span> <span class="param-type">(string)</span> - Filter by tournament (partial match)</div>
            <div class="param"><span class="param-name">subtopic/subtopics</span> <span class="param-type">(string/array)</span> - Filter by subtopic(s)</div>
            <div class="param"><span class="param-name">difficulty_min/max</span> <span class="param-type">(float)</span> - Difficulty range (0.0-1.0)</div>
            <div class="param"><span class="param-name">question_type</span> <span class="param-type">(string)</span> - Filter by question type: "mcq" for multiple choice, "frq" for free response</div>
            <div class="param"><span class="param-name">limit</span> <span class="param-type">(integer)</span> - Maximum number of questions to return (default: 50, max: 200)</div>
        </div>
        <div class="example">
            <strong>Example:</strong> <code>/api/questions?event=Chemistry%20Lab&division=C&question_type=mcq&limit=10</code>
        </div>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/questions/:id</span>
        <div class="description">Get a specific question by ID</div>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/questions</span>
        <div class="description">Create a new question</div>
        <div class="params">
            <strong>Required Body Fields:</strong> question, tournament, division, event<br>
            <strong>Optional:</strong> options, answers, subtopics, difficulty
        </div>
    </div>

    <div class="endpoint">
        <span class="method put">PUT</span>
        <span class="url">/api/questions/:id</span>
        <div class="description">Update an existing question</div>
    </div>

    <div class="endpoint">
        <span class="method delete">DELETE</span>
        <span class="url">/api/questions/:id</span>
        <div class="description">Delete a question</div>
    </div>

    <h2>📊 Metadata & Statistics</h2>
    
    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/meta/events</span>
        <div class="description">Get all available Science Olympiad events</div>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/meta/tournaments</span>
        <div class="description">Get all tournament names in the database</div>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/meta/subtopics</span>
        <div class="description">Get all subtopics, optionally filtered by event</div>
        <div class="params">
            <strong>Query Parameters:</strong><br>
            <div class="param"><span class="param-name">event</span> <span class="param-type">(string)</span> - Filter subtopics by event</div>
        </div>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/meta/stats</span>
        <div class="description">Get comprehensive database statistics including total questions, breakdown by event and division</div>
    </div>

    <h2>🚫 Question Moderation</h2>
    
    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/blacklists</span>
        <span class="feature-tag">Moderation</span>
        <div class="description">Get blacklisted questions (all or by event)</div>
        <div class="params">
            <strong>Query Parameters:</strong><br>
            <div class="param"><span class="param-name">event</span> <span class="param-type">(string)</span> - Filter by specific event</div>
        </div>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/blacklists</span>
        <div class="description">Add a question to the blacklist</div>
        <div class="params">
            <strong>Required Body:</strong> event, questionData
        </div>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/edits</span>
        <span class="feature-tag">Version Control</span>
        <div class="description">Get question edits/revisions (all or by event)</div>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/edits</span>
        <span class="feature-tag">AI Validation</span>
        <div class="description">Submit a question edit with AI validation</div>
        <div class="params">
            <strong>Required Body:</strong> event, originalQuestion, editedQuestion<br>
            <strong>Optional:</strong> reason, bypass (admin override)
        </div>
    </div>

    <h2>🔗 Collaborative Testing & Sharing</h2>
    
    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/share/generate</span>
        <span class="feature-tag">Real-time Sync</span>
        <div class="description">Generate a shareable test code for collaborative practice</div>
        <div class="params">
            <strong>Body:</strong> questionIds, testParamsRaw, timeRemainingSeconds, code (optional)
        </div>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/share</span>
        <div class="description">Retrieve shared test data using a share code</div>
        <div class="params">
            <strong>Query Parameters:</strong><br>
            <div class="param"><span class="param-name">code</span> <span class="param-type">(string)</span> - The 6-character share code</div>
        </div>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/codebusters/share/generate</span>
        <span class="feature-tag">Codebusters</span>
        <div class="description">Generate share code for Codebusters encrypted quotes</div>
        <div class="params">
            <strong>Body Parameters:</strong><br>
            <div class="param"><span class="param-name">testParams</span> <span class="param-type">(object)</span> - Test configuration including cipherTypes array</div>
            <div class="param"><span class="param-name">timeRemainingSeconds</span> <span class="param-type">(number)</span> - Time remaining for the test</div>
            <div class="param"><span class="param-name">quoteUUIDs</span> <span class="param-type">(array)</span> - Array of quote objects with id, language, and cipherType</div>
        </div>
        <div class="example">
            <strong>Example Request:</strong> <code>{"testParams": {"cipherTypes": ["Random Aristocrat", "Hill"]}, "timeRemainingSeconds": 3600, "quoteUUIDs": [{"id": "uuid1", "language": "en", "cipherType": "Random Aristocrat"}, {"id": "uuid2", "language": "en", "cipherType": "Hill"}]}</code><br>
            <strong>Response:</strong> <code>{"success": true, "data": {"shareCode": "HGN2A8", "expiresAt": "2025-08-13T00:56:18.869Z"}}</code>
        </div>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/codebusters/share</span>
        <div class="description">Retrieve Codebusters shared test data with encrypted quotes</div>
        <div class="params">
            <strong>Query Parameters:</strong><br>
            <div class="param"><span class="param-name">code</span> <span class="param-type">(string)</span> - The 6-character share code</div>
        </div>
        <div class="example">
            <strong>Example:</strong> <code>/api/codebusters/share?code=HGN2A8</code><br>
            <strong>Response:</strong> <code>{"success": true, "encryptedQuotes": [{"author": "Marcus Aurelius", "quote": "Original text", "encrypted": "NVZCZ KW DFNVKDI...", "cipherType": "Random Aristocrat", "key": "OERPZSIVKXLBJDFTHCWNQGUAM", "difficulty": 0.41}], "testParams": {"cipherTypes": ["Random Aristocrat", "Hill"]}, "adjustedTimeRemaining": 3600}</code>
        </div>
        <div class="info-box">
            <strong>Features:</strong> Uses UUID-based quote selection for consistency, supports multiple cipher types (Aristocrat, Patristocrat, Hill, Porta, Baconian, Caesar, Atbash, Affine, Nihilist, Fractionated Morse, Columnar Transposition, Xenocrypt), and integrates with the quotes database. Each quote is encrypted with its assigned cipher type and includes the decryption key.
        </div>
        <div class="info-box">
            <strong>Supported Cipher Types:</strong><br>
            • <strong>Aristocrat/Patristocrat:</strong> Substitution ciphers with unique key mapping<br>
            • <strong>Hill:</strong> Matrix-based encryption with 2x2 matrix<br>
            • <strong>Porta:</strong> Keyword-based substitution cipher<br>
            • <strong>Baconian:</strong> Binary encoding (A=AAAAA, B=AAAAB, etc.)<br>
            • <strong>Other Ciphers:</strong> Caesar, Atbash, Affine, Nihilist, Fractionated Morse, Columnar Transposition, Xenocrypt (all use Aristocrat encryption for consistency)
        </div>
    </div>

    <h2>📚 Quotes Management</h2>
    
    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/quotes</span>
        <span class="feature-tag">Quotes</span>
        <span class="feature-tag">Database</span>
        <div class="description">Retrieve quotes from the database with language filtering.</div>
        <div class="params">
            <strong>Query Parameters:</strong><br>
            <div class="param"><span class="param-name">language</span> <span class="param-type">(string)</span> - Filter quotes by language (default: 'en')</div>
            <div class="param"><span class="param-name">limit</span> <span class="param-type">(integer)</span> - Maximum number of quotes to return (default: 50, max: 200)</div>
        </div>
        <div class="example">
            <strong>Example:</strong> <code>/api/quotes?language=en&limit=10</code><br>
            <strong>Response:</strong> <code>{"success": true, "data": {"quotes": [{"id": "uuid", "author": "Author Name", "quote": "Quote text", "language": "en", "created_at": "timestamp"}]}}</code>
        </div>
        <div class="info-box">
            <strong>Integration:</strong> This endpoint is used by the Codebusters share functionality to retrieve quotes for encryption tests.
        </div>
    </div>

    <div class="endpoint">
        <span class="method delete">DELETE</span>
        <span class="url">/api/share/cleanup</span>
        <div class="description">Clean up expired share codes (admin endpoint)</div>
    </div>

    <h2>🤖 AI-Powered Features</h2>
    
    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/gemini/suggest-edit</span>
        <span class="feature-tag">AI Assistant</span>
        <div class="description">Get AI suggestions for improving a question</div>
        <div class="params">
            <strong>Body:</strong> question (object), userReason (optional)
        </div>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/gemini/analyze-question</span>
        <span class="feature-tag">Quality Control</span>
        <div class="description">AI analysis of question quality and potential issues</div>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/gemini/validate-edit</span>
        <span class="feature-tag">Edit Validation</span>
        <div class="description">Validate question edits using AI</div>
        <div class="params">
            <strong>Body:</strong> original (question object), edited (question object)
        </div>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/gemini/explain</span>
        <span class="feature-tag">Learning Aid</span>
        <div class="description">Generate detailed explanations for questions and answers</div>
        <div class="params">
            <strong>Body:</strong> question (object), userAnswer (optional), event (optional)
        </div>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/gemini/grade-free-responses</span>
        <span class="feature-tag">Auto-Grading</span>
        <div class="description">Automatically grade free-response questions using AI</div>
        <div class="params">
            <strong>Body:</strong> freeResponses (array of {question, correctAnswers, studentAnswer})
        </div>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/gemini/improve-reason</span>
        <div class="description">Improve user-provided reasons for reports using AI</div>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/gemini/extract-questions</span>
        <span class="feature-tag">Document Processing</span>
        <div class="description">Extract questions from PDF/document text using AI</div>
        <div class="params">
            <strong>Body:</strong> text (string)
        </div>
    </div>

    <h2>📋 Reporting & Quality Control</h2>
    
    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/report/edit</span>
        <span class="feature-tag">AI Validation</span>
        <div class="description">Submit question edit with AI validation and automatic approval/rejection</div>
    </div>

    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/report/remove</span>
        <span class="feature-tag">AI Moderation</span>
        <div class="description">Report question for removal with AI-powered evaluation</div>
    </div>

    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/report/all</span>
        <div class="description">Get all report data (blacklists and edits)</div>
    </div>

    <h2>📄 Document Processing</h2>
    
    <div class="endpoint">
        <span class="method post">POST</span>
        <span class="url">/api/process-pdf</span>
        <span class="feature-tag">PDF/DOCX Support</span>
        <div class="description">Process PDF or DOCX files and extract text content</div>
        <div class="params">
            <strong>Body:</strong> pdfData (base64), filename (optional)
        </div>
    </div>

    <h2>🔧 System Endpoints</h2>
    
    <div class="endpoint">
        <span class="method get">GET</span>
        <span class="url">/api/health</span>
        <div class="description">Health check endpoint for monitoring system status</div>
    </div>

    <h2>📋 Response Format</h2>
    
    <p>All endpoints return JSON responses with the following structure:</p>
    
    <div class="example">
        <strong>Success Response:</strong><br>
        <code>{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}</code>
    </div>

    <div class="example">
        <strong>Error Response:</strong><br>
        <code>{
  "success": false,
  "error": "Error description"
}</code>
    </div>

    <h2>🎯 Key Features</h2>
    
    <table>
        <tr>
            <th>Feature</th>
            <th>Description</th>
            <th>Endpoints</th>
        </tr>
        <tr>
            <td><strong>AI Question Analysis</strong></td>
            <td>Automated quality control and improvement suggestions</td>
            <td>/api/gemini/analyze-question, /api/gemini/suggest-edit</td>
        </tr>
        <tr>
            <td><strong>Collaborative Testing</strong></td>
            <td>Real-time synchronized practice tests with share codes</td>
            <td>/api/share/*, /api/codebusters/share/*</td>
        </tr>
        <tr>
            <td><strong>Auto-Grading</strong></td>
            <td>AI-powered grading of free-response questions</td>
            <td>/api/gemini/grade-free-responses</td>
        </tr>
        <tr>
            <td><strong>Document Processing</strong></td>
            <td>Extract and analyze questions from PDF/DOCX files</td>
            <td>/api/process-pdf, /api/gemini/extract-questions</td>
        </tr>
        <tr>
            <td><strong>Content Moderation</strong></td>
            <td>Community-driven question reporting and AI validation</td>
            <td>/api/report/*, /api/blacklists, /api/edits</td>
        </tr>
        <tr>
            <td><strong>Advanced Filtering</strong></td>
            <td>Sophisticated search and filtering capabilities</td>
            <td>/api/questions with query parameters</td>
        </tr>
    </table>

    <div class="info-box">
        <strong>Rate Limiting:</strong> AI endpoints may have rate limiting applied.<br>
        <strong>Authentication:</strong> Some admin endpoints may require authentication.<br>
        <strong>CORS:</strong> CORS is enabled for cross-origin requests.<br>
        <strong>Data Retention:</strong> Share codes expire after 7 days and are automatically cleaned up.
    </div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 