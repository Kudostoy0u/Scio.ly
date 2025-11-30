# Contact Directory

This directory contains the contact system for the Scio.ly platform. Provides contact functionality for users to reach out for support, feedback, and general inquiries.

## Files

### `page.tsx`
Server component wrapper that renders the contact client page.

**Example:**
```1:5:src/app/contact/page.tsx
import ContactClientPage from "./clientPage";

export default function ContactPage() {
  return <ContactClientPage />;
}
```

### `clientPage.tsx`
Client-side contact page component with contact form.

**Key Features:**
- Contact form with name, email, topic, and message fields
- Form validation
- Contact submission to `/api/contact` endpoint
- Success/error feedback
- Theme-aware styling

**Important Notes:**
- Uses `handleContactSubmission` utility from `@/app/utils/contactUtils`
- Form validation for required fields
- Toast notifications for success/error states
- Responsive design for mobile and desktop

## Important Notes

1. **Form Fields**: Name, email, topic, and message
2. **API Integration**: Submits to `/api/contact` endpoint
3. **Validation**: Client-side form validation
4. **Theme Support**: Dark/light mode support
5. **Error Handling**: Graceful error handling with user feedback
