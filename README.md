# AI Learning App

An AI-powered interactive learning application that generates custom educational curriculums. Describe what you want to learn and Claude generates a complete course with lessons, code examples, and quizzes.

## Features

- **Custom Curriculum Generation** - Enter any topic and get a 10-module course
- **Progressive Loading** - Modules appear as they're generated (3-5 minutes total)
- **Interactive Quizzes** - 7 questions per module with explanations
- **AI Chat Assistant** - Ask questions about the current lesson
- **Personalized Review** - Get review material based on quiz mistakes

## Quick Start

```bash
cd web-dev-app
npm install

# Add your API key
cp .env.example .env
# Edit .env and add: VITE_ANTHROPIC_API_KEY=sk-ant-...

npm run dev
```

Visit http://localhost:5173

## How It Works

1. **Phase 1** - Generate outline (10 modules, 3 pages each) ~5 seconds
2. **Phase 2** - Generate full content for each module sequentially ~30 sec each

This two-phase approach avoids API timeouts while providing progressive feedback.

## Tech Stack

- React + Vite
- Tailwind CSS
- Claude API (Anthropic)

## Project Structure

```
web-dev-claude/
├── web-dev-app/           # Main application
│   ├── src/
│   │   └── App.jsx        # Single-file app (~1800 lines)
│   ├── vite.config.js     # API proxy config
│   └── .env               # API key (gitignored)
└── CLAUDE.md              # Development documentation
```

## Requirements

- Node.js 18+
- Anthropic API key (get one at https://console.anthropic.com)
