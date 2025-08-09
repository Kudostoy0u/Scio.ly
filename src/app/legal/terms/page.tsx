import Header from '@/app/components/Header';
import ThemeSection from '@/app/components/ThemeSection';

export default function TermsOfServicePage() {
  return (
    <ThemeSection className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="prose prose-lg max-w-none">
          <p>Last updated: July 26, 2024</p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Scio.ly (the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
          <p>
            Scio.ly is a platform that provides practice questions, AI-powered explanations, and other tools for Science Olympiad preparation. The Service is provided &quot;as is&quot; and is constantly under development.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Conduct</h2>
          <p>You agree not to use the Service to:</p>
          <ul>
            <li>Post or transmit any content that is unlawful, harmful, or otherwise objectionable.</li>
            <li>Attempt to gain unauthorized access to the Service or its related systems.</li>
            <li>Disrupt or interfere with the security or use of the Service.</li>
          </ul>
          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are and will remain the exclusive property of Scio.ly and its licensors.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Disclaimer of Warranties</h2>
          <p>
            The Service is provided without warranties of any kind, whether express or implied. Scio.ly does not warrant that the Service will be uninterrupted, secure, or error-free.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Limitation of Liability</h2>
          <p>
            In no event shall Scio.ly, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages resulting from your access to or use of or inability to access or use the Service.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Changes to Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">8. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us.</p>
        </div>
      </main>
    </ThemeSection>
  );
}
