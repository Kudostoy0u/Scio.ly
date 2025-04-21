import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import api from '@/app/api'

const arr = api.arr

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(arr[Math.floor(Math.random() * arr.length)]);

export async function POST(request: NextRequest) {
  try {
    const { question, originalQuestion, event } = await request.json();
    
    if (!question || !event) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check with Gemini if the report is valid
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    
    const prompt = `
    You are evaluating a report for a Science Olympiad question. 
    The user wants to remove this question from the question bank.
    This is all the information the question has:
    
    Question: ${originalQuestion}
    Event: ${event}

    Evaluate whether this question should be removed from the question bank for ${event}.
    
    A question should ONLY be removed if:
    1. The question statement lacks information OR context (should be answerable standing alone) that is needed to answer the question, or the answer choices are unrelated to the question.
    2. It is completely inappropriate, offensive, or entirely unrelated to Science Olympiad
    3. The question makes no sense (What is it asking?)
    4. The question is not obviously a ${event} problem.
    
    A question should NOT be removed if:
    1. It has formatting or clarity issues that could be improved
    2. It's a valid question that the reporter simply doesn't like or finds challenging
    
    Reason through your evaluation step by step, then conclude with either "REMOVE" for removal or "KEEP" if it is a promising question: that should be the end of your response, no period.
    `;
    console.log(prompt)
    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    console.log(response)
    // Use a more robust pattern matching approach
    const isValid = !response.endsWith("KEEP")
    console.log(isValid)
    if (isValid) {
      // Add to blacklist in Vercel KV
      const blacklistKey = `blacklist:${event}`;
      
      // Get existing blacklist or create new one
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingBlacklist = await kv.get<any[]>(blacklistKey) || [];
      
      // Use the full question object if available, otherwise just use the question text
      const questionToStore = originalQuestion || question;
      
      // Check if question is already in blacklist
      const questionExists = existingBlacklist.some(item => {
        if (typeof item === 'string' && typeof questionToStore === 'string') {
          return item === questionToStore;
        } else if (typeof item === 'object' && typeof questionToStore === 'object') {
          return item.question === questionToStore.question;
        }
        return false;
      });
      
      // Add question to blacklist if not already present
      if (!questionExists) {
        await kv.set(blacklistKey, [...existingBlacklist, questionToStore]);
      }
      
      return NextResponse.json({ success: true, message: 'Question added to blacklist' });
    } else {
      return NextResponse.json({ success: false, message: 'AI determined this question should not be removed' });
    }
  } catch (error) {
    console.error('Error processing question removal:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 