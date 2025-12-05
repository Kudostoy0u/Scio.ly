"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { Shield } from "lucide-react";
import Example from "./Example";
import { WarningBox } from "./InfoBox";
import SectionHeader from "./SectionHeader";

export default function AuthenticationSection() {
	const { darkMode } = useTheme();
	return (
		<div id="authentication">
			<SectionHeader
				icon={<Shield className="w-6 h-6" />}
				title="Authentication"
				id="authentication"
			/>

			<div className="space-y-6">
				<div>
					<h3
						className={`text-xl font-semibold mb-4 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
					>
						API Key Authentication
					</h3>
					<p className={`mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
						Most API endpoints require authentication using API keys. API keys
						are provided on request - please contact us at
						team.scio.ly@gmail.com to request an API key.
					</p>

					<div className="space-y-4">
						<div>
							<h4
								className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
							>
								Authentication Methods
							</h4>
							<p
								className={`mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
							>
								All requests must include your API key using one of these
								methods:
							</p>

							<div className="space-y-3">
								<div>
									<h5
										className={`font-medium mb-2 ${darkMode ? "text-gray-200" : "text-gray-800"}`}
									>
										✅ Recommended: Headers
									</h5>
									<Example title="Headers" variant="request">
										{`X-API-Key: your-api-key-here
Authorization: Bearer your-api-key-here`}
									</Example>
								</div>

								<div>
									<h5
										className={`font-medium mb-2 ${darkMode ? "text-gray-200" : "text-gray-800"}`}
									>
										⚠️ Not Recommended: Query Parameter
									</h5>
									<WarningBox>
										<strong>Security Warning:</strong> Query parameters may be
										logged in server logs, browser history, and proxy logs. Use
										headers when possible.
									</WarningBox>
									<Example title="Query Parameter" variant="request">
										{
											"GET /api/questions?api_key=your-api-key-here&event=Chemistry%20Lab"
										}
									</Example>
								</div>
							</div>
						</div>

						<div>
							<h4
								className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
							>
								cURL Examples
							</h4>

							<div className="space-y-3">
								<div>
									<h5
										className={`font-medium mb-2 ${darkMode ? "text-gray-200" : "text-gray-800"}`}
									>
										✅ Recommended: Using Headers
									</h5>
									<Example title="API Request with Headers" variant="request">
										{`curl -H "X-API-Key: your-api-key" \\
     https://scio.ly/api/questions?event=Chemistry%20Lab`}
									</Example>
								</div>

								<div>
									<h5
										className={`font-medium mb-2 ${darkMode ? "text-gray-200" : "text-gray-800"}`}
									>
										⚠️ Not Recommended: Using Query Parameter
									</h5>
									<Example
										title="API Request with Query Parameter"
										variant="request"
									>
										{`curl "https://scio.ly/api/questions?event=Chemistry%20Lab&api_key=your-api-key"`}
									</Example>
								</div>
							</div>
						</div>

						<div>
							<h4
								className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
							>
								Public Endpoints
							</h4>
							<p
								className={`mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
							>
								The following endpoints do not require authentication:
							</p>
							<ul
								className={`space-y-1 text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
							>
								<li>
									•{" "}
									<code
										className={`${darkMode ? "bg-gray-800" : "bg-gray-100"} px-2 py-1 rounded`}
									>
										GET /api/docs
									</code>{" "}
									- API documentation
								</li>
								<li>
									•{" "}
									<code
										className={`${darkMode ? "bg-gray-800" : "bg-gray-100"} px-2 py-1 rounded`}
									>
										GET /api/meta/events
									</code>{" "}
									- List all events
								</li>
								<li>
									•{" "}
									<code
										className={`${darkMode ? "bg-gray-800" : "bg-gray-100"} px-2 py-1 rounded`}
									>
										GET /api/meta/tournaments
									</code>{" "}
									- List all tournaments
								</li>
								<li>
									•{" "}
									<code
										className={`${darkMode ? "bg-gray-800" : "bg-gray-100"} px-2 py-1 rounded`}
									>
										GET /api/meta/subtopics
									</code>{" "}
									- List all subtopics
								</li>
								<li>
									•{" "}
									<code
										className={`${darkMode ? "bg-gray-800" : "bg-gray-100"} px-2 py-1 rounded`}
									>
										GET /api/meta/stats
									</code>{" "}
									- Database statistics
								</li>
							</ul>
						</div>

						<div>
							<h4
								className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
							>
								Error Response
							</h4>
							<p
								className={`mb-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
							>
								When API key is missing or invalid:
							</p>
							<Example title="Error Response" variant="response">
								{`{
  "success": false,
  "error": "API_KEY_REQUIRED",
  "message": "Valid API key required. Contact us at team.scio.ly@gmail.com to request an API key."
}`}
							</Example>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
