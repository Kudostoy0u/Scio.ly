'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import SectionHeader from './SectionHeader';
import Endpoint from '../components/Endpoint';
import Param from '../components/Param';
import Example from '../components/Example';
import { InfoBox } from '../components/InfoBox';

export default function SystemSection() {
  const { darkMode } = useTheme();
  return (
    <div id="system">
      <SectionHeader icon={<ExternalLink className="w-6 h-6" />} title="System Endpoints" id="system" />
      
      <div className="space-y-6">
        <Endpoint 
          method="POST" 
          url="/api/contact" 
          description="Submit contact form messages with rate limiting and Discord webhook integration."
          features={['System']}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`text-sm md:text-base font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Request Body Schema</h4>
              <div className="space-y-2">
                <Param name="name" type="string" required description="Contact name" />
                <Param name="email" type="string" required description="Contact email" />
                <Param name="topic" type="string" description="Message topic (default: 'general')" />
                <Param name="message" type="string" required description="Message content" />
              </div>
            </div>

            <Example title="Request Example" variant="request">
{`{
  "name": "John Doe",
  "email": "john@example.com",
  "topic": "Bug Report",
  "message": "I found an issue with the Chemistry Lab questions..."
}`}
            </Example>

            <Example title="Response" variant="response">
{`{
  "success": true,
  "message": "Message sent successfully!"
}`}
            </Example>

            <InfoBox>
              <strong>Rate Limiting:</strong> 10 requests per minute per IP address.<br />
              <strong>Integration:</strong> Messages are sent to Discord webhook for team notification.
            </InfoBox>
          </div>
        </Endpoint>

        <Endpoint 
          method="GET" 
          url="/api/health" 
          description="Health check endpoint for monitoring system status and database connectivity."
          features={['System']}
        >
          <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "database": "connected",
    "version": "1.0.0"
  }
}`}
          </Example>
        </Endpoint>
      </div>
    </div>
  );
}


