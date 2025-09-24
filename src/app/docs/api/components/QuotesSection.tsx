'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useTheme } from '@/app/contexts/ThemeContext';
import SectionHeader from './SectionHeader';
import Endpoint from '../components/Endpoint';
import Param from '../components/Param';
import Example from '../components/Example';

export default function QuotesSection() {
  const { darkMode } = useTheme();
  return (
    <div id="quotes">
      <SectionHeader icon={<MessageSquare className="w-6 h-6" />} title="Quotes Management" id="quotes" />
      
      <div className="space-y-6">
        <Endpoint 
          method="GET" 
          url="/api/quotes" 
          description="Retrieve inspirational quotes with filtering options."
          features={['Quotes']}
        >
          <div className="space-y-4">
            <div>
              <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Query Parameters</h4>
              <div className="space-y-2">
                <Param name="language" type="string" description="Language filter (default: en)" />
                <Param name="limit" type="integer" description="Maximum quotes to return" />
                <Param name="charLengthMin" type="integer" description="Minimum character length" />
                <Param name="charLengthMax" type="integer" description="Maximum character length" />
              </div>
            </div>

            <Example title="Request" variant="request">
GET /api/quotes?language=en&limit=5&charLengthMin=50&charLengthMax=200
            </Example>

            <Example title="Response" variant="response">
{`{
  "success": true,
  "data": {
    "quotes": [
      { "quote": "The only way to do great work is to love what you do." },
      { "quote": "Innovation distinguishes between a leader and a follower." }
    ]
  }
}`}
            </Example>
          </div>
        </Endpoint>
      </div>
    </div>
  );
}


