# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An AI-powered interactive learning application built with React + Vite. The app allows users to generate custom educational curriculums by describing what they want to learn, then uses Claude API to generate complete courses with lessons, code examples, and quizzes.

Originally created as a static web development curriculum, the app has been refactored to support **dynamic curriculum generation** where users provide free-form text input and AI generates the entire curriculum structure and content.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev
# Opens at http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Single-Component Design
The entire application is contained in `src/App.jsx` (~1700 lines). This is intentional - the app uses a monolithic component structure rather than splitting into multiple files.

**Key architectural pattern:**
- All state managed with `useState` hooks (no Redux, Context API, or external state libraries)
- Conditional rendering used extensively to show/hide different UI sections
- All AI API calls use the same pattern with progress tracking

### Dual Curriculum System

The app supports two curriculum modes:

1. **Static Curriculum** (`staticModules` array, line ~231)
   - Original 6-module web development course
   - Hardcoded in App.jsx
   - Serves as fallback and example

2. **Dynamic Curriculum** (`generatedModules` state)
   - User describes what they want to learn
   - AI generates modules, pages, quizzes, and content
   - Uses same data structure as static curriculum

**Module selection logic (line ~988):**
```javascript
const modules = curriculumGenerated ? generatedModules : staticModules;
```

### Data Structure

Both static and generated curriculums follow this structure:
```javascript
{
  title: "Module Title",
  pages: [
    {
      title: "Page Title",
      content: "Markdown with **bold** and ```python code blocks"
    }
  ],
  quiz: [
    {
      question: "Question text",
      options: ["A", "B", "C", "D"],
      correct: 0,  // index
      explanation: "Why this is correct"
    }
  ]
}
```

### State Variables (22 total)

**Navigation (3):**
- `currentModule`, `currentPage`, `showMenu`

**Quiz (5):**
- `showQuiz`, `quizAnswers`, `showResults`, `moduleScores`, `dynamicQuiz`

**AI Features (3):**
- `reviewMaterial`, `isGenerating`, `loadingProgress`

**Chat (4):**
- `showChat`, `chatMessages`, `chatInput`, `chatProgress`

**Curriculum Generation (7):**
- `curriculumGenerated`, `generatingCurriculum`, `userInput`
- `curriculumProgress`, `generatedModules`, `showInputForm`, `generationError`

### Key Functions

**Curriculum Generation:**
- `generateCurriculum()` (line ~86) - Main AI curriculum generation
- `resetToInputForm()` (line ~213) - Reset to input form

**AI Features:**
- `generateAIQuiz()` (line ~1146) - Generate quiz questions
- `generateReviewMaterial()` (line ~1198) - Personalized review
- `sendChatMessage()` (line ~1252) - Chat assistant

**Content Rendering:**
- `renderContent()` (line ~41) - Parse and render Python code blocks with line numbers

## API Integration

### Anthropic Claude API

All AI features call `https://api.anthropic.com/v1/messages` with this pattern:

```javascript
fetch('/api/v1/messages', {  // Uses Vite proxy
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,  // From VITE_ANTHROPIC_API_KEY
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000-16000,  // Varies by feature
    messages: [{ role: 'user', content: prompt }]
  })
})
```

**Token limits by feature:**
- Curriculum generation: 16,000 tokens
- Quiz generation: 2,000 tokens
- Review material: 1,500 tokens
- Chat responses: 1,000 tokens

### Proxy Configuration

`vite.config.js` includes a proxy to avoid CORS issues:
- Requests to `/api/*` are forwarded to `https://api.anthropic.com/*`
- API key is sent from client in headers

### Environment Variables

`.env` file (required):
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Access in code: `import.meta.env.VITE_ANTHROPIC_API_KEY`

**Important:** Server restart required after changing `.env` file.

## Code Block Rendering

The app includes a custom Python code renderer:

1. **Regex parsing:** `/```python\n([\s\S]*?)```/g` extracts code blocks
2. **Line numbers:** Rendered in table layout with line numbers
3. **Styling:** Dark theme (`bg-gray-900`), green text (`text-green-400`)
4. **Indentation:** `whitespace-pre` CSS class preserves spaces
5. **Scrolling:** `max-h-96 overflow-y-auto` for long code

## Progress Tracking Pattern

All async AI operations use this pattern:

```javascript
const progressInterval = setInterval(() => {
  setProgress(prev => Math.min(prev + Math.random() * 8, 95));
}, 300-800);

try {
  // API call
  setProgress(100);
  setTimeout(() => {
    clearInterval(progressInterval);
    setIsGenerating(false);
    setProgress(0);
  }, 500);
} catch (error) {
  clearInterval(progressInterval);
  setIsGenerating(false);
  setProgress(0);
}
```

**Always cleanup intervals** in both success and error paths.

## UI Flow

### Initial Load
1. User sees input form (`InputFormComponent`, line ~1314)
2. Form includes examples and "View Default Curriculum" option
3. User can describe what they want to learn or use default

### After Generation
1. Progress bar shows 0-100% during 30-60 second generation
2. On success, `showInputForm` becomes false, curriculum displays
3. "New Curriculum" button in header allows starting over
4. All original features work with generated curriculum

### Conditional Rendering Structure
```jsx
{showInputForm ? (
  <InputFormComponent />
) : (
  <>
    <Header with "New Curriculum" button />
    <Module Menu />
    <Course Pages />
    <Quizzes />
    <Chat Window />
    <Review Material />
  </>
)}
```

## AI Prompt Engineering

### Curriculum Generation Prompt
- **Critical requirement:** "Return ONLY valid JSON, no markdown formatting"
- **Structure specification:** Provides exact JSON schema
- **Content guidelines:** 4-6 modules, 2-4 pages each, 2-4 quiz questions
- **Code examples:** Instructs to include ```python blocks or relevant language
- **Style:** Conversational, educational, explains WHY not just WHAT

### JSON Parsing Strategy
1. Try direct `JSON.parse()`
2. If fails, regex extract from markdown: `/```(?:json)?\s*(\{[\s\S]*\})\s*```/`
3. Validate structure before using

## Common Pitfalls

1. **JSX Fragment Matching:** Ensure `<>` and `</>` are properly paired
2. **Interval Cleanup:** Always clear intervals in try/catch/finally
3. **API Key Issues:** Must restart server after changing `.env`
4. **CORS Errors:** All API calls must use `/api/` proxy path
5. **State Dependencies:** Curriculum must be generated before setting `showInputForm = false`

## Testing Generated Features

To test curriculum generation:
1. Start dev server: `npm run dev`
2. Enter text like: "I want to learn React hooks including useState, useEffect, and custom hooks"
3. Wait 30-60 seconds
4. Verify modules, pages, and quizzes render correctly
5. Test existing features (AI quiz, review, chat) work with generated content

## Known Constraints

- No localStorage/sessionStorage (state-only persistence)
- One curriculum per session (no save/load functionality)
- Single-file architecture (intentional design choice)
- Client-side API key (visible in browser, acceptable for personal use)
- No backend/database

## Styling

- **Framework:** Tailwind CSS utility classes
- **Icons:** Lucide React (`Menu`, `X`, `MessageCircle`, `ChevronRight`, `ChevronLeft`)
- **Color scheme:** Indigo primary (`indigo-600`), gradient background (`blue-50` to `indigo-100`)
- **Responsive:** Mobile-friendly grid layouts

## Future Considerations

If enhancing this app:
- Keep single-component architecture unless complexity truly requires splitting
- Maintain backward compatibility with static curriculum
- Follow existing AI integration patterns
- Preserve code block rendering system
- Use same progress tracking approach for new async operations
