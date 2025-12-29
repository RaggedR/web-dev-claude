# Web Development Curriculum App

An AI-powered interactive web development learning application built with React. This curriculum teaches web development concepts to students with Python programming knowledge, featuring dynamic quizzes, personalized review materials, and an AI chat assistant.

## Features

- **6 Comprehensive Modules** covering:
  - Web Architecture & HTTP (with Flask tutorials)
  - Data Storage (SQL & NoSQL)
  - Cloud Infrastructure (IaaS, PaaS, SaaS, Containers)
  - Cloud Storage & CDN
  - Microservices & Serverless
  - Security (IAM, Encryption)

- **Python Code Examples** with syntax highlighting and line numbers
- **Interactive Quizzes** for each module
- **AI-Powered Features**:
  - Dynamic quiz generation
  - Personalized review material based on wrong answers
  - Context-aware chat assistant
- **Progress Tracking** across all modules

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)

### Installing Node.js

1. Visit [https://nodejs.org/](https://nodejs.org/)
2. Download the LTS (Long Term Support) version
3. Run the installer and follow the installation prompts
4. Verify installation by opening a terminal and running:
   ```bash
   node --version
   npm --version
   ```

## Setup Instructions

### 1. Install Dependencies

Navigate to the project directory and install the required packages:

```bash
cd web-dev-app
npm install
```

This will install:
- React and React DOM
- Vite (build tool)
- Tailwind CSS (styling)
- Lucide React (icons)

### 2. Configure API Key

The app uses the Anthropic API for AI features (quiz generation, review material, chat assistant).

1. Get your API key:
   - Visit [https://console.anthropic.com/](https://console.anthropic.com/)
   - Sign up or log in
   - Generate an API key from the dashboard

2. Create a `.env` file in the `web-dev-app` directory:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and add your API key:
   ```
   VITE_ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

**Important:** Never commit your `.env` file to version control. It's already included in `.gitignore`.

### 3. Run the Development Server

Start the local development server:

```bash
npm run dev
```

The app will open at `http://localhost:5173` (or another port if 5173 is busy).

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 4. Open in Your Browser

Navigate to the URL shown in your terminal (usually `http://localhost:5173`).

## Building for Production

To create a production-optimized build:

```bash
npm run build
```

This creates a `dist` folder with optimized static files.

To preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
web-dev-app/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles + Tailwind
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
├── .env.example         # Example environment variables
└── README.md           # This file
```

## Using the App

### Navigation

- Use the **☰ Menu** button to switch between modules
- Click **Next/Previous** to navigate course pages
- Take quizzes at the end of each module

### Quizzes

1. Click **Take Quiz** after completing a module
2. Answer all questions
3. Click **Submit Quiz** to see your results
4. Use **New AI Quiz** to generate fresh questions
5. Click **Review Material** to get personalized help on wrong answers

### Chat Assistant

1. Click the **Chat Assistant** button
2. Ask questions about the current module
3. Get context-aware explanations

## Troubleshooting

### API Key Issues

If AI features aren't working:
- Verify your `.env` file exists and contains the correct API key
- Make sure the key starts with `sk-ant-`
- Restart the development server after adding the API key

### Port Already in Use

If port 5173 is already in use, Vite will automatically use the next available port. Check the terminal output for the correct URL.

### Dependencies Not Installing

If `npm install` fails:
- Make sure you have Node.js 18+ installed
- Try deleting `node_modules` and `package-lock.json`, then run `npm install` again
- Check your internet connection

### Styling Issues

If Tailwind CSS isn't working:
- Make sure `npm install` completed successfully
- Verify `tailwind.config.js` and `postcss.config.js` exist
- Try restarting the dev server

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Anthropic Claude API** - AI features

## Development

### Hot Module Replacement (HMR)

Vite provides instant updates as you edit files. Changes to React components will update immediately without losing state.

### Code Style

The app uses:
- Functional React components with hooks
- Tailwind CSS utility classes
- JSX for component markup

## API Usage & Costs

The app makes API calls to Anthropic for:
- Generating quiz questions (~2000 tokens)
- Creating review material (~1500 tokens)
- Chat responses (~1000 tokens)

Monitor your API usage at [https://console.anthropic.com/](https://console.anthropic.com/).

## License

This is an educational project. Feel free to use and modify as needed.

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the Anthropic API documentation: [https://docs.anthropic.com/](https://docs.anthropic.com/)
- Check Vite documentation: [https://vitejs.dev/](https://vitejs.dev/)
