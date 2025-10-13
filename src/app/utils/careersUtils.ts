/**
 * Careers utilities for Science Olympiad platform
 * Provides career application form handling and submission
 */

/**
 * Careers form data interface
 * Contains all fields for career application submissions
 */
interface CareersFormData {
  /** Applicant's full name */
  name: string;
  /** Applicant's email address */
  email: string;
  /** Applicant's Discord ID */
  discordId: string;
  /** Position being applied for */
  position: string;
  /** Hours per week availability */
  hoursPerWeek: string;
  /** Relevant experience */
  experience: string;
  /** Additional message */
  message: string;
}

/**
 * Handle careers form submission
 * Submits career application data to the API
 * 
 * @param {CareersFormData} data - Career application form data
 * @returns {Promise<{ success: boolean; message: string }>} Submission result
 * @example
 * ```typescript
 * const result = await handleCareersSubmission({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   discordId: 'john#1234',
 *   position: 'Developer',
 *   hoursPerWeek: '20',
 *   experience: '5 years',
 *   message: 'Interested in contributing'
 * });
 * ```
 */
export const handleCareersSubmission = async (data: CareersFormData): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true, message: 'Application submitted successfully! We\'ll get back to you soon.' };
  } catch (error) {
    console.error('Error sending careers form:', error);
    return { success: false, message: 'Failed to submit application. Please try again.' };
  }
};
