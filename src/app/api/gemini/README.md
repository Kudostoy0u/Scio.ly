# Scio.ly Gemini API Documentation

## Overview

The `src/app/api/gemini/` directory contains the Gemini AI API endpoints for the Scio.ly platform. This system provides comprehensive AI-powered functionality including question analysis, explanations, grading, and content generation using Google Gemini 2.0 Flash.

## Directory Structure

### Core Gemini API Endpoints

#### `analyze-question/`
- **Purpose**: Question analysis endpoint
- **Features**:
  - Question difficulty analysis
  - Topic identification
  - Question type classification
  - Content validation
- **Dependencies**: Gemini AI service, question processing
- **Methods**: POST
- **Request**: Question data, analysis parameters
- **Response**: Analysis results, recommendations

#### `explain/`
- **Purpose**: Question explanation endpoint
- **Features**:
  - AI-generated explanations
  - Step-by-step solutions
  - Concept explanations
  - Learning resources
- **Dependencies**: Gemini AI service, explanation generation
- **Methods**: POST
- **Request**: Question data, explanation type
- **Response**: Detailed explanations, learning materials

#### `extract-questions/`
- **Purpose**: Question extraction endpoint
- **Features**:
  - Text-to-question conversion
  - Question parsing
  - Format standardization
  - Question validation
- **Dependencies**: Gemini AI service, text processing
- **Methods**: POST
- **Request**: Source text, extraction parameters
- **Response**: Extracted questions, metadata

#### `grade-free-responses/`
- **Purpose**: Free response grading endpoint
- **Features**:
  - AI-powered grading
  - Rubric-based scoring
  - Feedback generation
  - Grade justification
- **Dependencies**: Gemini AI service, grading algorithms
- **Methods**: POST
- **Request**: Student responses, grading criteria
- **Response**: Grades, feedback, explanations

#### `improve-reason/`
- **Purpose**: Reasoning improvement endpoint
- **Features**:
  - Answer reasoning analysis
  - Improvement suggestions
  - Logic validation
  - Reasoning enhancement
- **Dependencies**: Gemini AI service, reasoning analysis
- **Methods**: POST
- **Request**: Answer data, reasoning context
- **Response**: Improvement suggestions, reasoning analysis

#### `suggest-edit/`
- **Purpose**: Content edit suggestions endpoint
- **Features**:
  - AI-powered edit suggestions
  - Content improvement
  - Grammar correction
  - Style enhancement
- **Dependencies**: Gemini AI service, content analysis
- **Methods**: POST
- **Request**: Content to edit, edit parameters
- **Response**: Edit suggestions, improvement recommendations

#### `validate-edit/`
- **Purpose**: Edit validation endpoint
- **Features**:
  - Edit quality validation
  - Content accuracy checking
  - Edit appropriateness
  - Validation scoring
- **Dependencies**: Gemini AI service, validation algorithms
- **Methods**: POST
- **Request**: Original content, edited content
- **Response**: Validation results, quality scores

## Gemini API System Architecture

### AI Integration
- **Gemini 2.0 Flash**: Advanced AI model integration
- **Structured Content**: JSON-structured AI responses
- **Streaming Support**: Real-time AI content generation
- **Error Handling**: Robust AI error management

### Content Generation
- **Question Analysis**: Comprehensive question evaluation
- **Explanation Generation**: AI-powered explanations
- **Content Improvement**: AI-assisted content enhancement
- **Quality Validation**: AI-based content validation

### Performance Optimization
- **Request Batching**: Efficient AI request handling
- **Caching**: Strategic AI response caching
- **Rate Limiting**: AI API rate management
- **Error Recovery**: AI service error handling

## Key Features

### 1. Question Analysis
- **Difficulty Assessment**: AI-powered difficulty analysis
- **Topic Classification**: Automatic topic identification
- **Question Type Detection**: Question format recognition
- **Content Quality**: Question quality evaluation

### 2. Explanation Generation
- **Step-by-Step Solutions**: Detailed solution explanations
- **Concept Explanations**: Educational concept breakdowns
- **Learning Resources**: Additional learning materials
- **Adaptive Explanations**: Personalized explanation styles

### 3. Content Processing
- **Text Extraction**: Question extraction from text
- **Content Standardization**: Format standardization
- **Quality Validation**: Content quality assessment
- **Metadata Generation**: Automatic metadata creation

### 4. AI Grading
- **Rubric-Based Scoring**: Structured grading criteria
- **Feedback Generation**: Detailed student feedback
- **Grade Justification**: Transparent grading explanations
- **Performance Analytics**: Grading performance metrics

## Technical Implementation

### API Architecture
- **RESTful Design**: Standard REST API patterns
- **Error Handling**: Comprehensive error management
- **Authentication**: Secure API access
- **Rate Limiting**: API usage management

### AI Integration
- **Gemini Service**: Core AI service integration
- **Request Processing**: AI request handling
- **Response Parsing**: AI response processing
- **Error Recovery**: AI service error handling

### Performance
- **Optimization**: API performance optimization
- **Caching**: Strategic response caching
- **Monitoring**: API performance monitoring
- **Scalability**: API scalability management

## API Endpoints

### Question Analysis
```typescript
POST /api/gemini/analyze-question
{
  "question": "string",
  "context": "string",
  "analysisType": "difficulty" | "topic" | "quality"
}
```

### Explanation Generation
```typescript
POST /api/gemini/explain
{
  "question": "string",
  "answer": "string",
  "explanationType": "step-by-step" | "concept" | "detailed"
}
```

### Content Extraction
```typescript
POST /api/gemini/extract-questions
{
  "text": "string",
  "extractionType": "multiple-choice" | "free-response" | "all"
}
```

### AI Grading
```typescript
POST /api/gemini/grade-free-responses
{
  "responses": "string[]",
  "rubric": "object",
  "gradingCriteria": "object"
}
```

## Error Handling

### AI Service Errors
- **Rate Limiting**: AI API rate limit handling
- **Service Unavailable**: AI service downtime handling
- **Invalid Responses**: AI response validation
- **Timeout Handling**: AI request timeout management

### API Errors
- **Authentication**: API authentication errors
- **Validation**: Request validation errors
- **Processing**: Content processing errors
- **Response**: Response generation errors

## Performance Optimization

### Caching Strategy
- **Response Caching**: AI response caching
- **Request Deduplication**: Duplicate request handling
- **Cache Invalidation**: Cache management
- **Performance Monitoring**: Cache performance tracking

### Request Optimization
- **Batching**: Request batching for efficiency
- **Compression**: Response compression
- **Streaming**: Real-time response streaming
- **Error Recovery**: Request retry mechanisms

## Testing

### Test Coverage
- **Unit Tests**: Individual endpoint testing
- **Integration Tests**: AI service integration testing
- **Performance Tests**: API performance testing
- **Error Tests**: Error handling testing

### Test Files
- **Route Tests**: API endpoint testing
- **Service Tests**: AI service testing
- **Integration Tests**: End-to-end testing
- **Performance Tests**: Load testing

## Dependencies

### Core Dependencies
- **Next.js**: API framework
- **TypeScript**: Type safety
- **Gemini AI**: AI service integration
- **Supabase**: Database integration

### AI Dependencies
- **Google Gemini**: AI model service
- **AI Processing**: Content processing
- **Response Parsing**: AI response handling
- **Error Handling**: AI error management

## Usage Examples

### Question Analysis
```typescript
const analysis = await fetch('/api/gemini/analyze-question', {
  method: 'POST',
  body: JSON.stringify({
    question: 'What is the chemical formula for water?',
    analysisType: 'difficulty'
  })
});
```

### Explanation Generation
```typescript
const explanation = await fetch('/api/gemini/explain', {
  method: 'POST',
  body: JSON.stringify({
    question: 'Calculate the area of a circle',
    answer: 'A = πr²',
    explanationType: 'step-by-step'
  })
});
```

### AI Grading
```typescript
const grades = await fetch('/api/gemini/grade-free-responses', {
  method: 'POST',
  body: JSON.stringify({
    responses: ['Student answer 1', 'Student answer 2'],
    rubric: { criteria: 'accuracy', weight: 0.5 }
  })
});
```

## Development Guidelines

### API Design
- **RESTful Patterns**: Standard REST API design
- **Error Handling**: Comprehensive error management
- **Documentation**: Clear API documentation
- **Testing**: Thorough API testing

### Performance
- **Optimization**: API performance optimization
- **Caching**: Strategic response caching
- **Monitoring**: Performance monitoring
- **Scalability**: API scalability planning

### Security
- **Authentication**: Secure API access
- **Validation**: Input validation
- **Rate Limiting**: API usage limits
- **Error Handling**: Secure error responses

---

*This documentation provides a comprehensive overview of the Scio.ly Gemini API system and its functionality.*
