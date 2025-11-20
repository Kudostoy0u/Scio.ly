import Header from "@/app/components/Header";
import ThemeSection from "@/app/components/ThemeSection";

export default function PrivacyPolicyPage() {
  return (
    <ThemeSection className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-lg prose-slate max-w-none dark:prose-invert dark:prose-headings:text-gray-100 dark:prose-p:text-gray-300 dark:prose-li:text-gray-300 dark:prose-strong:text-gray-100">
          <p>Last updated: July 26, 2024</p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
          <p>
            Welcome to Scio.ly. We are committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our
            Service.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
          <p>
            We may collect personal information from you such as your name, email address, and
            school information when you register for an account. We also collect non-personal
            information, such as browser type, operating system, and usage details.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and maintain our Service.</li>
            <li>Improve, personalize, and expand our Service.</li>
            <li>Understand and analyze how you use our Service.</li>
            <li>
              Communicate with you, including updates and other information relating to the Service.
            </li>
          </ul>
          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Sharing Your Information</h2>
          <p>
            We do not sell, trade, or otherwise transfer to outside parties your Personally
            Identifiable Information unless we provide users with advance notice. This does not
            include hosting partners and other parties who assist us in operating our website,
            conducting our business, or serving our users, so long as those parties agree to keep
            this information confidential.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Security of Your Information</h2>
          <p>
            We use administrative, technical, and physical security measures to help protect your
            personal information. Despite our efforts, no security measures are perfect or
            impenetrable.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new Privacy Policy on this page.
          </p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at
            team.scio.ly@gmail.com or our Contact form.
          </p>
        </div>
      </main>
    </ThemeSection>
  );
}
