# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An AI-powered interactive learning application built with React + Vite. The app allows users to generate custom educational curriculums by describing what they want to learn, then uses Claude API to generate complete courses with lessons, code examples, and quizzes.

The app uses a **two-phase curriculum generation approach** to avoid timeouts and provide progressive loading.

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

**Important:** Server must be restarted after changing `.env` file.

## Architecture

### Single-Component Design
The entire application is contained in `src/App.jsx` (~1800 lines). This is intentional - the app uses a monolithic component structure rather than splitting into multiple files.

**Key architectural patterns:**
- All state managed with `useState` hooks (no Redux, Context API, or external state libraries)
- Conditional rendering used extensively to show/hide different UI sections
- All AI API calls share common helper functions

### Two-Phase Curriculum Generation

**Critical Architecture Pattern** to avoid timeouts on large curriculum generation:

**Phase 1: Generate Outline** (fast, ~5 seconds)
- Single API call requesting only module and page titles
- Creates structure for 10 modules × 3 pages each
- Max tokens: 2,000

**Phase 2: Progressive Module Generation** (3-5 minutes total)
- 10 separate API calls, one per module
- Each call generates: 3 full pages + 7 quiz questions
- Max tokens per module: 5,000
- Modules appear in UI as they're generated (progressive loading)
- Total: 11 API calls (1 outline + 10 modules)

**Implementation:**
```javascript
// Phase 1: Outline
const outline = await generateOutline(userInput);
setCurriculumOutline(outline);

// Phase 2: Modules (sequential loop)
for (let i = 0; i < outline.modules.length; i++) {
  const module = await generateModule(outlineModule.title, outlineModule.pages, i);
  modules.push(module);
  setGeneratedModules([...modules]); // Display immediately
  if (i === 0) setShowInputForm(false); // Switch to curriculum view
}
```

### Dual Curriculum System

The app supports two curriculum modes:

1. **Static Curriculum** (`staticModules` array, line ~1000)
   - Original 6-module web development course
   - Hardcoded in App.jsx
   - Serves as fallback and example

2. **Dynamic Curriculum** (`generatedModules` state)
   - User describes what they want to learn
   - AI generates 10 modules, 3 pages each, 7 quiz questions per module
   - Uses same data structure as static curriculum

**Module selection logic:**
```javascript
const modules = generatedModules.length > 0 ? generatedModules : staticModules;
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

### State Variables (24 total)

**Navigation (3):**
- `currentModule`, `currentPage`, `showMenu`

**Quiz (5):**
- `showQuiz`, `quizAnswers`, `showResults`, `moduleScores`, `dynamicQuiz`

**AI Features (3):**
- `reviewMaterial`, `isGenerating`, `loadingProgress`

**Chat (4):**
- `showChat`, `chatMessages`, `chatInput`, `chatProgress`

**Curriculum Generation (9):**
- `curriculumGenerated`, `generatingCurriculum`, `userInput`
- `curriculumProgress`, `generatedModules`, `showInputForm`, `generationError`
- `curriculumOutline`, `generationStatus`

### Key Functions

**Curriculum Generation:**
- `callAPI()` (line ~88) - Shared API helper with error handling
- `parseJSON()` (line ~114) - Parse JSON with markdown extraction fallback
- `generateOutline()` (line ~127) - Phase 1: Generate module/page titles
- `generateModule()` (line ~161) - Phase 2: Generate full module content
- `generateCurriculum()` (line ~211) - Main orchestrator for two-phase generation
- `resetToInputForm()` (line ~260) - Reset to input form

**AI Features:**
- `generateAIQuiz()` - Generate dynamic quiz questions
- `generateReviewMaterial()` - Personalized review based on wrong answers
- `sendChatMessage()` - Context-aware chat assistant

**Content Rendering:**
- `renderContent()` (line ~43) - Parse and render Python code blocks with line numbers

## API Integration

### Anthropic Claude API

**Critical Header Required:** All browser-based API calls MUST include:
```javascript
'anthropic-dangerous-direct-browser-access': 'true'
```

Without this header, requests will fail with 401 authentication error.

**API Call Pattern:**
```javascript
const response = await fetch('/api/v1/messages', {  // Uses Vite proxy
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,  // From VITE_ANTHROPIC_API_KEY
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'  // REQUIRED
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000-5000,  // Varies by feature
    messages: [{ role: 'user', content: prompt }]
  })
})
```

**Token limits by feature:**
- Curriculum outline: 2,000 tokens
- Module generation: 5,000 tokens per module
- Quiz generation: 2,000 tokens
- Review material: 1,500 tokens
- Chat responses: 1,000 tokens

### Proxy Configuration

`vite.config.js` includes a proxy to avoid CORS issues:
- Requests to `/api/*` are forwarded to `https://api.anthropic.com/*`
- Timeout: 180 seconds (3 minutes) to handle module generation
- API key is sent from client in headers

### Environment Variables

`.env` file (required):
```
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
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

## UI Flow

### Initial Load
1. User sees input form with examples
2. Form includes "View Default Curriculum" option
3. User describes what they want to learn or uses default

### During Generation
1. Progress bar appears on input form (0-100%)
2. Status updates: "Creating curriculum outline...", "Generating module 1/10: ..."
3. Progress: 5% (outline) → 10-100% (modules)
4. Input form remains visible until first module completes
5. After module 1: switches to curriculum view
6. Remaining modules appear progressively in menu

### After Generation
1. Full curriculum displays with 10 modules
2. "New Curriculum" button in header allows starting over
3. All features work with generated curriculum

### Conditional Rendering Structure
```jsx
{showInputForm ? (
  <InputFormComponent with progress bar />
) : (
  <>
    <Header with "New Curriculum" button />
    <Module Menu (shows all generated modules) />
    <Course Pages />
    <Quizzes />
    <Chat Window />
    <Review Material />
  </>
)}
```

## AI Prompt Engineering

### Curriculum Outline Prompt
- **Critical requirement:** "Return ONLY valid JSON, no markdown formatting"
- **Structure:** 10 modules, each with 3 page titles
- **Max tokens:** 2,000 (fast response)

### Module Generation Prompt
- **Critical requirement:** "Return ONLY valid JSON"
- **Structure:** 3 full pages (300-500 words each) + 7 quiz questions
- **Content guidelines:** Educational, practical examples, code blocks
- **Max tokens:** 5,000 per module

### JSON Parsing Strategy
1. Try direct `JSON.parse()`
2. If fails, regex extract from markdown: `/```(?:json)?\s*(\{[\s\S]*\})\s*```/`
3. Validate structure before using

## Common Pitfalls

1. **Missing Browser Header:** API calls fail with 401 without `anthropic-dangerous-direct-browser-access: true`
2. **API Key Issues:** Must restart server after changing `.env`
3. **Rate Limits:** Too many rapid requests trigger 429 errors (wait 10-15 min)
4. **Timeouts:** Single large API calls timeout - hence the two-phase approach
5. **State Dependencies:** Input form hides only after first module is generated
6. **HMR Focus Issues:** Hot reload can cause input focus loss during development

## Debugging

**Browser Console Access:**
- **Mac:** Cmd+Option+J (Chrome) or Cmd+Option+I (DevTools)
- **Windows/Linux:** F12 or Ctrl+Shift+I

**When debugging API issues:**
1. Open Network tab BEFORE making request
2. Look for `/api/v1/messages` requests
3. Check Response tab for actual error messages
4. Status 401 = missing header or invalid API key
5. Status 429 = rate limit (wait and retry)
6. Pending → timeout or still processing

**Console logs show:**
- "Generating outline for: [topic]"
- "Outline generated: {modules: Array(10)}"
- "Generating module 1/10: [title]"
- "Module 1 generated successfully"
- Errors with stack traces

## Testing Generated Features

To test curriculum generation:
1. Start dev server: `npm run dev`
2. Enter specific topic (e.g., "AWS Lambda basics")
3. Wait for outline (5 sec) + modules (3-5 min total)
4. Verify progressive module appearance in menu
5. Test all features (quiz, review, chat) work with generated content

## Known Constraints

- No localStorage/sessionStorage (state-only persistence)
- One curriculum per session (no save/load functionality)
- Single-file architecture (intentional design choice)
- Client-side API key (visible in browser, acceptable for personal use)
- No backend/database
- Sequential module generation (not parallel, to avoid rate limits)

## Styling

- **Framework:** Tailwind CSS utility classes
- **Icons:** Lucide React (`Menu`, `X`, `MessageCircle`, `ChevronRight`, `ChevronLeft`)
- **Color scheme:** Indigo primary (`indigo-600`), gradient background (`blue-50` to `indigo-100`)
- **Responsive:** Mobile-friendly grid layouts

## Future Considerations

If enhancing this app:
- Keep single-component architecture unless complexity truly requires splitting
- Maintain backward compatibility with static curriculum
- Keep two-phase generation pattern to avoid timeouts
- Any new AI features should use `callAPI()` helper function
- Always include `anthropic-dangerous-direct-browser-access` header
- Consider parallel module generation with rate limit handling
