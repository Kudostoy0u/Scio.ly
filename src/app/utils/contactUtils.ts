/**
 * Contact form utilities for Science Olympiad platform
 * Provides contact form handling and submission functionality
 */

/**
 * Contact form data interface
 */
interface ContactFormData {
  /** User's full name */
  name: string;
  /** User's email address */
  email: string;
  /** Contact topic/subject */
  topic: string;
  /** Contact message content */
  message: string;
}

/**
 * Handles contact form submission
 * Submits contact form data to the API endpoint
 *
 * @param {ContactFormData} data - Contact form data to submit
 * @returns {Promise<{ success: boolean; message: string }>} Submission result with success status and message
 * @throws {Error} When API request fails
 * @example
 * ```typescript
 * const result = await handleContactSubmission({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   topic: 'Support',
 *   message: 'I need help with...'
 * });
 * console.log(result.success); // true or false
 * ```
 */
export const handleContactSubmission = async (
  data: ContactFormData
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true, message: "Message sent successfully!" };
  } catch (_error) {
    return { success: false, message: "Failed to send message. Please try again." };
  }
};
