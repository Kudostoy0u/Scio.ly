import { NextRequest, NextResponse } from 'next/server';
import { getQuotesByLanguage } from '@/lib/db/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'en';
    
    // Fetch quotes from database
    const quotes = await getQuotesByLanguage(language);
    
    if (!quotes || quotes.length === 0) {
      return NextResponse.json({ error: 'No quotes found for language: ' + language }, { status: 404 });
    }
    
    // Transform to match expected format
    const formattedQuotes = quotes.map(quote => ({
      id: quote.id,
      author: quote.author,
      quote: quote.quote
    }));
    
    return NextResponse.json({ quotes: formattedQuotes });
  } catch (error) {
    console.error('Error fetching quotes from database:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
} 