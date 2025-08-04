interface ContactFormData {
  name: string;
  email: string;
  topic: string;
  message: string;
}

export const handleContactSubmission = async (data: ContactFormData): Promise<{ success: boolean; message: string }> => {
  try {
    const webhookUrl = 'https://discord.com/api/webhooks/1400981832459354153/7ThkCtECErJdRF2tIoO6NO-8LKtftOYXPVvkSrI4AG6XQsMUGm_UO599IqeLpWhPd6iv';
    
    const embed = {
      title: 'New Contact Form Submission',
      color: 0x0099ff,
      fields: [
        {
          name: 'Name',
          value: data.name,
          inline: true,
        },
        {
          name: 'Email',
          value: data.email,
          inline: true,
        },
        {
          name: 'Topic',
          value: data.topic.charAt(0).toUpperCase() + data.topic.slice(1),
          inline: true,
        },
        {
          name: 'Message',
          value: data.message,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
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