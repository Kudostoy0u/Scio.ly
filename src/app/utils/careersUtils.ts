interface CareersFormData {
  name: string;
  email: string;
  position: string;
  experience: string;
  message: string;
}

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
