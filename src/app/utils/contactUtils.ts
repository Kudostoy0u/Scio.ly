interface ContactFormData {
  name: string;
  email: string;
  topic: string;
  message: string;
}

export const handleContactSubmission = async (data: ContactFormData): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true, message: 'Message sent successfully!' };
  } catch (error) {
    console.error('Error sending contact form:', error);
    return { success: false, message: 'Failed to send message. Please try again.' };
  }
}; 