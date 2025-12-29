import React, { useState } from 'react';
import { Menu, X, MessageCircle, ChevronRight, ChevronLeft } from 'lucide-react';

function App() {
  // API Key
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  // Navigation state
  const [currentModule, setCurrentModule] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [moduleScores, setModuleScores] = useState({});
  const [dynamicQuiz, setDynamicQuiz] = useState(null);

  // AI features state
  const [reviewMaterial, setReviewMaterial] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatProgress, setChatProgress] = useState(0);

  // Curriculum generation state
  const [curriculumGenerated, setCurriculumGenerated] = useState(false);
  const [generatingCurriculum, setGeneratingCurriculum] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [curriculumProgress, setCurriculumProgress] = useState(0);
  const [generatedModules, setGeneratedModules] = useState([]);
  const [showInputForm, setShowInputForm] = useState(true);
  const [generationError, setGenerationError] = useState(null);
  const [curriculumOutline, setCurriculumOutline] = useState(null);
  const [generationStatus, setGenerationStatus] = useState('');

  // Helper function to render content with Python code blocks
  const renderContent = (content) => {
    const codeBlockRegex = /```python\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'code', content: match[1] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return parts.map((part, idx) => {
      if (part.type === 'code') {
        const lines = part.content.split('\n');
        return (
          <div key={idx} className="my-4 bg-gray-900 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full">
              <tbody>
                {lines.map((line, lineIdx) => (
                  <tr key={lineIdx} className="hover:bg-gray-800">
                    <td className="text-gray-500 text-right pr-4 pl-2 py-1 select-none" style={{width: '40px'}}>
                      {lineIdx + 1}
                    </td>
                    <td className="text-green-400 py-1 pr-2 whitespace-pre font-mono text-sm">
                      {line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return <div key={idx} dangerouslySetInnerHTML={{ __html: part.content.replace(/\n/g, '<br/>') }} />;
    });
  };

  // Helper function to call API
  const callAPI = async (prompt, maxTokens = 4000) => {
    const response = await fetch('/api/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  };

  // Parse JSON response
  const parseJSON = (text) => {
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Failed to parse JSON response');
    }
  };

  // PHASE 1: Generate outline
  const generateOutline = async (topic) => {
    setGenerationStatus('Creating curriculum outline...');
    console.log('Generating outline for:', topic);

    const prompt = `Create a curriculum outline for: "${topic}"

Return ONLY valid JSON with this structure:
{
  "modules": [
    {
      "title": "Module Title",
      "pages": ["Page 1 Title", "Page 2 Title", "Page 3 Title"]
    }
  ]
}

Requirements:
- Exactly 10 modules
- Each module has exactly 3 page titles
- Titles should be clear and educational
- Return ONLY the JSON, no explanations`;

    const responseText = await callAPI(prompt, 2000);
    const outline = parseJSON(responseText);

    if (!outline.modules || outline.modules.length !== 10) {
      throw new Error('Invalid outline: must have exactly 10 modules');
    }

    console.log('Outline generated:', outline);
    return outline;
  };

  // PHASE 2: Generate module content
  const generateModule = async (moduleTitle, pageTitles, moduleIndex) => {
    setGenerationStatus(`Generating module ${moduleIndex + 1}/10: ${moduleTitle}...`);
    console.log(`Generating module ${moduleIndex + 1}:`, moduleTitle);

    try {
      const prompt = `Generate full content for this curriculum module:

Module Title: "${moduleTitle}"
Pages: ${pageTitles.map((t, i) => `${i + 1}. ${t}`).join(', ')}

Return ONLY valid JSON:
{
  "title": "${moduleTitle}",
  "pages": [
    {
      "title": "Page Title",
      "content": "Educational content with **bold** text, code examples in \`\`\`python (or relevant language) blocks. 300-500 words per page."
    }
  ],
  "quiz": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "Why this is correct"
    }
  ]
}

Requirements:
- Exactly 3 pages with titles matching the page list above
- Each page: 300-500 words, educational, practical examples
- Exactly 7 quiz questions testing understanding
- Use code blocks for examples
- Return ONLY JSON`;

      console.log(`Calling API for module ${moduleIndex + 1}...`);
      const responseText = await callAPI(prompt, 5000);
      console.log(`Got response for module ${moduleIndex + 1}, parsing...`);
      const module = parseJSON(responseText);

      console.log(`Module ${moduleIndex + 1} generated successfully`);
      return module;
    } catch (error) {
      console.error(`Error generating module ${moduleIndex + 1}:`, error);
      throw error;
    }
  };

  // Main curriculum generation
  const generateCurriculum = async () => {
    if (!userInput.trim()) {
      setGenerationError('Please describe what you want to learn');
      return;
    }

    setGenerationError(null);
    setGeneratingCurriculum(true);
    setCurriculumProgress(0);
    setGeneratedModules([]);
    // Keep input form visible until first module is generated

    try {
      // PHASE 1: Get outline
      setCurriculumProgress(5);
      const outline = await generateOutline(userInput);
      setCurriculumOutline(outline);
      setCurriculumProgress(10);

      // PHASE 2: Generate each module
      const modules = [];
      for (let i = 0; i < outline.modules.length; i++) {
        const outlineModule = outline.modules[i];
        const module = await generateModule(outlineModule.title, outlineModule.pages, i);
        modules.push(module);

        // Update progress and display module immediately
        setGeneratedModules([...modules]);
        setCurriculumProgress(10 + ((i + 1) / 10) * 90);

        // Hide input form after first module appears
        if (i === 0) {
          setShowInputForm(false);
        }
      }

      // Success!
      setGenerationStatus('Complete!');
      setCurriculumProgress(100);
      setTimeout(() => {
        setGeneratingCurriculum(false);
        setCurriculumProgress(0);
        setCurriculumGenerated(true);
        setGenerationStatus('');
        setCurrentModule(0);
        setCurrentPage(0);
        setShowQuiz(false);
        setShowResults(false);
        setQuizAnswers({});
      }, 1000);

    } catch (error) {
      console.error('Error:', error);
      setGeneratingCurriculum(false);
      setCurriculumProgress(0);
      setGenerationError(error.message || 'Failed to generate curriculum');
      setGenerationStatus('');
      setShowInputForm(true);
    }
  };

  // Reset to input form
  const resetToInputForm = () => {
    setShowInputForm(true);
    setCurriculumGenerated(false);
    setGeneratedModules([]);
    setUserInput('');
    setGenerationError(null);
    setCurrentModule(0);
    setCurrentPage(0);
    setShowQuiz(false);
    setShowResults(false);
    setQuizAnswers({});
    setModuleScores({});
    setDynamicQuiz(null);
    setReviewMaterial(null);
    setChatMessages([]);
  };

  // Static curriculum data (fallback)
  const staticModules = [
    {
      title: "Web Architecture & HTTP",
      pages: [
        {
          title: "HTTP Basics with Python",
          content: `Let's start by understanding how web communication works. When you visit a website, your browser sends an HTTP request to a server, which sends back an HTTP response.

**HTTP Requests have:**
- **Method**: GET (retrieve data), POST (send data), PUT (update), DELETE (remove)
- **URL**: The address of the resource
- **Headers**: Metadata like content type, authentication tokens
- **Body**: Data being sent (for POST/PUT)

**HTTP Responses have:**
- **Status Code**: 200 (OK), 404 (Not Found), 500 (Server Error)
- **Headers**: Content type, caching info, cookies
- **Body**: The actual data (HTML, JSON, etc.)

Let's see how to make HTTP requests in Python using the requests library:

\`\`\`python
import requests

# GET request - retrieve data
response = requests.get('https://api.github.com/users/octocat')
print(response.status_code)  # 200
print(response.json())  # Parsed JSON data

# POST request - send data
data = {'username': 'alice', 'email': 'alice@example.com'}
response = requests.post('https://api.example.com/users', json=data)
print(response.json())

# Adding headers (like authentication)
headers = {'Authorization': 'Bearer YOUR_TOKEN'}
response = requests.get('https://api.example.com/private', headers=headers)
\`\`\`

**Why this matters:** Every web app you build will handle HTTP requests and responses. Understanding this flow is fundamental to web development.`
        },
        {
          title: "Flask Part 1: Basic Web Server",
          content: `Flask is a Python web framework that makes it easy to build web applications. It handles the HTTP layer for you so you can focus on your application logic.

**Setting up Flask:**

\`\`\`python
from flask import Flask

app = Flask(__name__)

# Route - maps URL to function
@app.route('/')
def home():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(debug=True, port=5000)
\`\`\`

When you run this and visit http://localhost:5000, Flask receives the HTTP GET request, calls your \`home()\` function, and sends the return value back as the response.

**Dynamic URLs with Parameters:**

\`\`\`python
@app.route('/user/<username>')
def show_user(username):
    return f'User: {username}'

@app.route('/post/<int:post_id>')
def show_post(post_id):
    # post_id is automatically converted to integer
    return f'Post ID: {post_id}'
\`\`\`

Visit http://localhost:5000/user/alice to see "User: alice"

**Query Parameters:**

\`\`\`python
from flask import request

@app.route('/search')
def search():
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    return f'Searching for: {query} (page {page})'
\`\`\`

Visit http://localhost:5000/search?q=python&page=2

**Why this matters:** Routes are how you define your API endpoints. Every feature in your app gets its own route.`
        },
        {
          title: "Flask Part 2: REST API & CRUD",
          content: `Let's build a real API that handles Create, Read, Update, Delete operations. We'll create a simple todo list API.

**REST Principles:**
- Use HTTP methods correctly: GET (read), POST (create), PUT/PATCH (update), DELETE (delete)
- Use meaningful URLs: /todos, /todos/123
- Return appropriate status codes

\`\`\`python
from flask import Flask, request, jsonify

app = Flask(__name__)

# In-memory storage (in real apps, use a database)
todos = [
    {'id': 1, 'task': 'Learn Flask', 'done': False},
    {'id': 2, 'task': 'Build an API', 'done': False}
]
next_id = 3

# GET all todos
@app.route('/api/todos', methods=['GET'])
def get_todos():
    return jsonify(todos)

# GET single todo
@app.route('/api/todos/<int:todo_id>', methods=['GET'])
def get_todo(todo_id):
    todo = next((t for t in todos if t['id'] == todo_id), None)
    if todo is None:
        return jsonify({'error': 'Todo not found'}), 404
    return jsonify(todo)

# POST - create new todo
@app.route('/api/todos', methods=['POST'])
def create_todo():
    global next_id
    data = request.get_json()

    new_todo = {
        'id': next_id,
        'task': data.get('task'),
        'done': data.get('done', False)
    }
    next_id += 1
    todos.append(new_todo)

    return jsonify(new_todo), 201  # 201 Created

# PUT - update todo
@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    todo = next((t for t in todos if t['id'] == todo_id), None)
    if todo is None:
        return jsonify({'error': 'Todo not found'}), 404

    data = request.get_json()
    todo['task'] = data.get('task', todo['task'])
    todo['done'] = data.get('done', todo['done'])

    return jsonify(todo)

# DELETE todo
@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    global todos
    todos = [t for t in todos if t['id'] != todo_id]
    return '', 204  # 204 No Content
\`\`\`

**Testing your API:**

\`\`\`python
import requests

# Create a todo
response = requests.post('http://localhost:5000/api/todos',
    json={'task': 'Test the API'})
print(response.json())

# Get all todos
response = requests.get('http://localhost:5000/api/todos')
print(response.json())

# Update a todo
requests.put('http://localhost:5000/api/todos/1',
    json={'task': 'Learn Flask', 'done': True})

# Delete a todo
requests.delete('http://localhost:5000/api/todos/2')
\`\`\`

**Why this matters:** This is the pattern you'll use for every API you build. Modern apps separate the frontend (React, mobile app) from the backend API.`
        },
        {
          title: "Flask Part 3: Database Integration",
          content: `Real applications need persistent storage. Let's integrate a database using SQLAlchemy, Python's most popular ORM (Object-Relational Mapper).

**Setting up SQLAlchemy:**

\`\`\`python
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todos.db'
db = SQLAlchemy(app)

# Define your data model
class Todo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task = db.Column(db.String(200), nullable=False)
    done = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'task': self.task,
            'done': self.done,
            'created_at': self.created_at.isoformat()
        }

# Create tables
with app.app_context():
    db.create_all()
\`\`\`

**CRUD Operations with Database:**

\`\`\`python
# CREATE
@app.route('/api/todos', methods=['POST'])
def create_todo():
    data = request.get_json()
    todo = Todo(task=data['task'], done=data.get('done', False))
    db.session.add(todo)
    db.session.commit()
    return jsonify(todo.to_dict()), 201

# READ all
@app.route('/api/todos', methods=['GET'])
def get_todos():
    todos = Todo.query.all()
    return jsonify([todo.to_dict() for todo in todos])

# READ one
@app.route('/api/todos/<int:todo_id>', methods=['GET'])
def get_todo(todo_id):
    todo = Todo.query.get_or_404(todo_id)
    return jsonify(todo.to_dict())

# UPDATE
@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    todo = Todo.query.get_or_404(todo_id)
    data = request.get_json()

    todo.task = data.get('task', todo.task)
    todo.done = data.get('done', todo.done)
    db.session.commit()

    return jsonify(todo.to_dict())

# DELETE
@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    todo = Todo.query.get_or_404(todo_id)
    db.session.delete(todo)
    db.session.commit()
    return '', 204
\`\`\`

**Querying and Filtering:**

\`\`\`python
# Get only completed todos
@app.route('/api/todos/completed', methods=['GET'])
def get_completed_todos():
    todos = Todo.query.filter_by(done=True).all()
    return jsonify([todo.to_dict() for todo in todos])

# Search todos
@app.route('/api/todos/search', methods=['GET'])
def search_todos():
    query = request.args.get('q', '')
    todos = Todo.query.filter(Todo.task.contains(query)).all()
    return jsonify([todo.to_dict() for todo in todos])
\`\`\`

**Error Handling:**

\`\`\`python
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500
\`\`\`

**Production Tips:**
- Use environment variables for database URLs
- Add input validation
- Implement authentication (JWT tokens)
- Use database migrations (Flask-Migrate)
- Add logging
- Use connection pooling for better performance

**Why this matters:** This is production-ready code. SQLAlchemy handles all the SQL for you, prevents SQL injection, and makes it easy to switch databases.`
        }
      ],
      quiz: [
        {
          question: "You're building an API endpoint that allows users to upload a profile picture. Which HTTP method should you use?",
          options: ["GET", "POST", "PUT", "DELETE"],
          correct: 1,
          explanation: "POST is used to create new resources or upload data. While PUT could work for updates, POST is the standard choice for initial uploads."
        },
        {
          question: "Your Flask API returns a 404 error when accessing /api/users/123, but the user exists in the database. What's the most likely cause?",
          options: [
            "The database connection is down",
            "The route parameter type doesn't match (e.g., expecting string but got int)",
            "CORS is blocking the request",
            "The user needs authentication"
          ],
          correct: 1,
          explanation: "If you defined the route as /api/users/<username> expecting a string, but are passing an integer ID, Flask won't match the route."
        },
        {
          question: "In a Flask-SQLAlchemy app, when should you call db.session.commit()?",
          options: [
            "After every single database query",
            "Only after INSERT, UPDATE, or DELETE operations",
            "Never - SQLAlchemy commits automatically",
            "Only when the server shuts down"
          ],
          correct: 1,
          explanation: "You only need to commit after operations that change data (INSERT, UPDATE, DELETE). SELECT queries don't need commits."
        }
      ]
    },
    {
      title: "Data Storage",
      pages: [
        {
          title: "SQL Databases",
          content: `SQL databases store data in tables with rows and columns. They're excellent for structured data with relationships.

**Key Concepts:**

**Tables & Relationships:**
- One-to-Many: A user has many posts
- Many-to-Many: Students and courses (needs junction table)
- One-to-One: User and profile

**ACID Properties:**
- **Atomicity**: All or nothing transactions
- **Consistency**: Data follows all rules
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed data survives crashes

**When to use SQL:**
- Complex queries with joins
- Transaction requirements (banking, e-commerce)
- Structured data with clear relationships
- Need for data integrity and constraints

**Popular SQL Databases:**
- PostgreSQL: Full-featured, great for production
- MySQL: Fast, widely used
- SQLite: Serverless, perfect for development/small apps`
        },
        {
          title: "NoSQL Databases",
          content: `NoSQL databases store data in flexible formats. They sacrifice some consistency for scalability and flexibility.

**Types of NoSQL:**

**1. Document Stores (MongoDB)**
Store JSON-like documents. Great for flexible schemas.
- Use case: Content management, user profiles, catalogs

**2. Key-Value Stores (Redis)**
Simple key-value pairs, extremely fast.
- Use case: Caching, session storage, real-time analytics

**3. Wide-Column Stores (Cassandra)**
Tables with dynamic columns, highly scalable.
- Use case: Time-series data, IoT, large-scale analytics

**4. Graph Databases (Neo4j)**
Nodes and relationships, optimized for connected data.
- Use case: Social networks, recommendation engines

**When to use NoSQL:**
- Flexible/evolving schemas
- Massive scale (millions of users)
- Simple queries (no complex joins)
- High write throughput

**JSON vs Protocol Buffers:**

**JSON** - Human readable, flexible
- Great for web APIs, configuration files
- Larger size, slower parsing

**Protocol Buffers** - Binary format, efficient
- Used in microservices (gRPC)
- Smaller, faster, but not human-readable
- Requires schema definition`
        }
      ],
      quiz: [
        {
          question: "You're building a social network where users follow each other and you need to query 'friends of friends'. Which database would be most efficient?",
          options: ["PostgreSQL", "MongoDB", "Redis", "Neo4j (Graph database)"],
          correct: 3,
          explanation: "Graph databases like Neo4j are optimized for relationship queries. Finding 'friends of friends' would require complex joins in SQL but is a simple graph traversal in Neo4j."
        },
        {
          question: "Your e-commerce app needs to ensure that when a user purchases an item, inventory decreases and payment is recorded - both must succeed or both must fail. What do you need?",
          options: [
            "A NoSQL database for speed",
            "ACID transactions",
            "A caching layer like Redis",
            "Eventual consistency"
          ],
          correct: 1,
          explanation: "ACID transactions ensure atomicity - either both operations succeed or both fail, maintaining data consistency. This is critical for financial operations."
        }
      ]
    },
    {
      title: "Cloud Infrastructure",
      pages: [
        {
          title: "IaaS, PaaS, SaaS",
          content: `Cloud services come in different layers of abstraction. Think of it like transportation options:

**IaaS (Infrastructure as a Service) - Rent a car**
You get: Virtual machines, networking, storage
You manage: OS, runtime, applications, data
Examples: AWS EC2, Google Compute Engine, Azure VMs

**Use IaaS when:**
- You need full control over the environment
- Running custom or legacy software
- Specific OS or configuration requirements

**PaaS (Platform as a Service) - Take a taxi**
You get: Runtime environment, automatic scaling
You manage: Just your code and data
Examples: Heroku, Google App Engine, AWS Elastic Beanstalk

**Use PaaS when:**
- You want to focus on code, not infrastructure
- Building standard web apps or APIs
- Need automatic scaling and deployment

**SaaS (Software as a Service) - Take a bus**
You get: Complete application
You manage: Just your data and configuration
Examples: Gmail, Salesforce, Shopify

**Use SaaS when:**
- You need a ready-made solution
- Don't want to maintain software

**Why this matters:** Choosing the right layer affects development speed, cost, and control. Most modern apps use a mix of all three.`
        },
        {
          title: "Containers & VMs",
          content: `Containers and VMs both provide isolated environments, but work very differently.

**Virtual Machines:**
- Include entire OS (GBs in size)
- Boot time: minutes
- Strong isolation
- Heavier resource usage

**Containers (Docker):**
- Share host OS kernel (MBs in size)
- Boot time: seconds
- Lightweight isolation
- Efficient resource usage

**Docker Basics:**
Containers package your app with all its dependencies. A Dockerfile defines the container:

\`\`\`dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
\`\`\`

Build and run:
\`\`\`bash
docker build -t myapp .
docker run -p 5000:5000 myapp
\`\`\`

**Kubernetes:**
Orchestrates containers at scale. It handles:
- Load balancing across containers
- Auto-scaling based on demand
- Self-healing (restarts failed containers)
- Rolling updates with zero downtime

**Key Concepts:**
- **Pod**: Smallest unit, runs one or more containers
- **Service**: Stable endpoint for accessing pods
- **Deployment**: Manages replicas of your app
- **Namespace**: Logical cluster separation

**Why this matters:** Containers are the standard for modern deployment. They ensure "works on my machine" means "works in production."`
        }
      ],
      quiz: [
        {
          question: "You built a Flask app that works on your laptop but crashes in production with 'module not found' errors. What's the best solution?",
          options: [
            "Document the exact pip install commands",
            "Use a Docker container",
            "Only hire developers with identical laptops",
            "Rewrite the app to not use external modules"
          ],
          correct: 1,
          explanation: "Docker containers package your app with all dependencies, ensuring identical environments from development to production. This eliminates 'works on my machine' issues."
        },
        {
          question: "Your startup is building a standard web app. You want to focus on code and let someone else handle servers, scaling, and OS updates. What should you choose?",
          options: ["IaaS like EC2", "PaaS like Heroku", "SaaS like Shopify", "Your own data center"],
          correct: 1,
          explanation: "PaaS handles infrastructure management for you. You just deploy code and the platform handles servers, scaling, updates, etc. Perfect for standard web apps when you want to move fast."
        }
      ]
    },
    {
      title: "Cloud Storage & CDN",
      pages: [
        {
          title: "Storage Types",
          content: `Different storage types are optimized for different use cases.

**Block Storage:**
- Like a hard drive attached to a VM
- Fixed size volumes
- Fast, low-latency
- Examples: AWS EBS, Azure Disk Storage
- Use for: Databases, VM boot drives

**File Storage:**
- Network file system, shared across servers
- Hierarchical structure (folders/files)
- Examples: AWS EFS, Azure Files
- Use for: Shared application data, home directories

**Object Storage:**
- Store files as objects with metadata
- Accessed via HTTP/API, not file system
- Infinitely scalable
- Examples: AWS S3, Google Cloud Storage
- Use for: Media files, backups, static websites

**S3 Deep Dive:**
S3 (Simple Storage Service) is the most popular object storage.

**Key concepts:**
- **Buckets**: Containers for objects
- **Objects**: Files with metadata
- **Keys**: Unique identifier (like a file path)

**Storage Classes:**
- S3 Standard: Frequent access, high cost
- S3 Infrequent Access: Cheaper, for backups
- S3 Glacier: Archival, very cheap, slow retrieval

**Why this matters:** Choosing the right storage saves money. Storing TB of video in block storage costs 10x more than S3.`
        },
        {
          title: "CDN (Content Delivery Network)",
          content: `CDNs cache your content across the globe, making your site faster for users everywhere.

**How CDNs Work:**
1. User in Tokyo requests your image
2. CDN edge server in Tokyo checks its cache
3. If cached: Returns immediately (fast!)
4. If not cached: Fetches from origin, caches it, returns to user
5. Next Tokyo user gets cached version

**Benefits:**
- **Speed**: Users get content from nearby servers
- **Reduced load**: Your origin server handles less traffic
- **DDoS protection**: CDN absorbs attack traffic
- **Availability**: Content served even if origin is down

**CloudFront (AWS CDN):**
- Integrates with S3
- Caches static assets (images, CSS, JS)
- Can cache API responses
- Supports custom SSL certificates

**Common Setup:**
1. Upload static assets to S3
2. Create CloudFront distribution pointing to S3
3. Use CloudFront URL in your app
4. Set cache expiration rules

**Example Use Case:**
Your React app hosted on Vercel, user images in S3 + CloudFront:
- HTML/JS from Vercel (edge network)
- User uploads to S3
- Images served via CloudFront
- Users worldwide get fast load times

**Why this matters:** A CDN can reduce page load time from 3 seconds to 300ms. That's the difference between users staying or leaving.`
        }
      ],
      quiz: [
        {
          question: "You're building a video streaming platform. Users upload videos and millions of users stream them globally. Where should you store the videos?",
          options: [
            "Block storage attached to your web server",
            "File storage shared between your web servers",
            "Object storage (S3) with CloudFront CDN",
            "In your PostgreSQL database"
          ],
          correct: 2,
          explanation: "S3 scales infinitely and is cost-effective for large files. CloudFront caches videos globally, so users stream from nearby servers. Block/file storage can't scale to millions of users, and databases are terrible for large binary files."
        },
        {
          question: "Your website's images load slowly for users in Europe, even though your US server is fast. What's the issue?",
          options: [
            "You need a faster web server",
            "You need a bigger database",
            "Network latency - you need a CDN",
            "Your images are too large"
          ],
          correct: 2,
          explanation: "The speed of light causes latency between continents (~100-200ms). A CDN solves this by caching images on European servers, eliminating the cross-Atlantic round trip."
        }
      ]
    },
    {
      title: "Microservices & Serverless",
      pages: [
        {
          title: "Microservices Architecture",
          content: `Microservices break your app into small, independent services that communicate over a network.

**Monolith vs Microservices:**

**Monolith** - One big application
- Pros: Simple to develop and deploy, easy to debug
- Cons: Hard to scale, one bug can crash everything

**Microservices** - Multiple small services
- Pros: Scale independently, team autonomy, tech diversity
- Cons: Complex deployment, network latency, harder to debug

**Example Architecture:**
- User Service: Handles authentication, profiles
- Product Service: Manages product catalog
- Order Service: Processes orders
- Payment Service: Handles transactions
- Each has its own database (database per service)

**Service Communication:**

**Synchronous (REST/gRPC):**
- Service A calls Service B and waits for response
- Use when: Need immediate response, simple workflows

**Asynchronous (Message Queues):**
- Service A sends message to queue, Service B processes later
- Use when: Long operations, need reliability, decoupling

**API Gateway:**
Acts as single entry point:
- Routes requests to correct service
- Handles authentication
- Rate limiting
- Response aggregation

**Why this matters:** Microservices let you scale hot services independently. If your payment service gets slammed on Black Friday, scale only that service.`
        },
        {
          title: "Serverless & Lambda",
          content: `Serverless means you write functions, cloud provider runs them. No servers to manage.

**AWS Lambda:**
Write a function, AWS runs it when triggered.

**How it works:**
1. Upload your code as a Lambda function
2. Set up a trigger (HTTP request, file upload, schedule)
3. AWS runs your code when triggered
4. You pay only for execution time (rounded to 100ms)

**Example Lambda:**
Image resize service - when user uploads image to S3, Lambda automatically resizes it:

1. User uploads image to S3 bucket
2. S3 triggers Lambda function
3. Lambda downloads image, resizes it, uploads thumbnail
4. All automatic, scales to millions of uploads

**Benefits:**
- **No server management**: AWS handles everything
- **Auto-scaling**: 1 request or 1 million, same code
- **Pay per use**: No cost when not running
- **Fast deployment**: Just upload code

**Limitations:**
- **Cold starts**: First request can be slow (~100-1000ms)
- **Time limits**: Max execution time (15 min for Lambda)
- **Stateless**: Can't maintain state between invocations

**When to use Serverless:**
- Event-driven tasks (process uploads, send emails)
- Scheduled jobs (daily reports, cleanup tasks)
- API endpoints with variable traffic
- Webhooks

**When NOT to use:**
- Long-running tasks (video encoding, ML training)
- WebSocket servers (need persistent connections)
- Very high-frequency, low-latency needs

**Why this matters:** Serverless lets you build features without infrastructure complexity. Perfect for MVPs and startups.`
        }
      ],
      quiz: [
        {
          question: "Your e-commerce site has steady traffic except Black Friday when orders spike 50x. What's the most cost-effective architecture?",
          options: [
            "Monolith running on large EC2 instance sized for peak traffic",
            "Monolith with auto-scaling",
            "Microservices with order service auto-scaling independently",
            "Rewrite everything as Lambda functions"
          ],
          correct: 2,
          explanation: "With microservices, only the order service needs to scale 50x. Your user/product/search services keep normal capacity. This saves money vs scaling the entire monolith."
        },
        {
          question: "You need to process user-uploaded images (crop, resize, filter) which takes 5-30 seconds per image. Which is the best choice?",
          options: [
            "Synchronous API endpoint on your web server",
            "AWS Lambda triggered by S3 upload",
            "Add the processing to your database stored procedure",
            "Make the user's browser do it with JavaScript"
          ],
          correct: 1,
          explanation: "Lambda is perfect for event-driven processing. S3 upload triggers Lambda, which processes async. User doesn't wait, Lambda auto-scales, you pay only for processing time. Web server would block other requests during processing."
        }
      ]
    },
    {
      title: "Security",
      pages: [
        {
          title: "IAM & Authentication",
          content: `IAM (Identity and Access Management) controls who can do what in your system.

**Authentication vs Authorization:**
- **Authentication**: Who are you? (Login)
- **Authorization**: What can you do? (Permissions)

**AWS IAM:**
Controls access to AWS resources.

**Key concepts:**
- **Users**: Individual people or services
- **Groups**: Collection of users (Developers, Admins)
- **Roles**: Permissions that services assume
- **Policies**: JSON documents defining permissions

**Principle of Least Privilege:**
Give minimum permissions needed. If a Lambda function only reads from S3, don't give it write access.

**Example Policy:**
\`\`\`json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::my-bucket/*"
}
\`\`\`

**Authentication Methods:**

**Session-based:**
- Server stores session after login
- Cookie sent with each request
- Use for: Traditional web apps

**Token-based (JWT):**
- Server signs token, sends to client
- Client includes token in requests
- Server verifies signature
- Use for: APIs, mobile apps, microservices

**OAuth 2.0:**
- Let users login with Google/GitHub/etc
- Your app never sees their password
- Use for: Third-party authentication

**Why this matters:** Security breaches are expensive. Proper IAM prevents unauthorized access and limits damage from compromised credentials.`
        },
        {
          title: "Encryption & Secrets",
          content: `Encryption protects data from unauthorized access. Two main types:

**Encryption at Rest:**
Data stored on disk is encrypted.
- If someone steals the hard drive, data is useless without key
- AWS automatically encrypts EBS volumes, S3 buckets

**Encryption in Transit:**
Data is encrypted while moving over network.
- HTTPS encrypts data between browser and server
- TLS encrypts data between services

**Key Management Service (KMS):**
AWS service that manages encryption keys.

**How it works:**
1. You tell KMS to encrypt data
2. KMS uses a master key to generate a data key
3. Data is encrypted with data key
4. Data key is encrypted with master key
5. Both stored together (but encrypted key is safe)

**Benefits:**
- Automatic key rotation
- Audit trail (who used which key when)
- Integration with AWS services

**Secrets Manager:**
Store sensitive configuration (API keys, database passwords).

**Without Secrets Manager (BAD):**
\`\`\`python
DATABASE_PASSWORD = "mypassword123"  # In code!
\`\`\`

**With Secrets Manager (GOOD):**
\`\`\`python
import boto3
client = boto3.client('secretsmanager')
response = client.get_secret_value(SecretId='prod/db/password')
DATABASE_PASSWORD = response['SecretString']
\`\`\`

**Benefits:**
- Never store secrets in code
- Automatic rotation
- Audit access
- Easy to update without redeploying code

**Best Practices:**
1. Never commit secrets to git
2. Use environment variables (dev)
3. Use Secrets Manager (production)
4. Rotate credentials regularly
5. Use HTTPS everywhere
6. Encrypt sensitive data at rest

**Why this matters:** A leaked API key can cost thousands in fraudulent charges. Proper secret management prevents breaches.`
        }
      ],
      quiz: [
        {
          question: "Your Flask app needs to access an S3 bucket. Where should you store the AWS credentials?",
          options: [
            "In your code as constants",
            "In a config file committed to git",
            "Use IAM roles for the EC2/Lambda instance",
            "Email them to all developers"
          ],
          correct: 2,
          explanation: "IAM roles let your EC2 instance or Lambda function access AWS services without hardcoded credentials. AWS automatically provides temporary credentials. This is the most secure approach."
        },
        {
          question: "A user reports they can see other users' orders by changing the order ID in the URL. What's the problem?",
          options: [
            "You need encryption at rest",
            "You need HTTPS",
            "You're not checking authorization",
            "You need a CDN"
          ],
          correct: 2,
          explanation: "This is a classic authorization bug. The API checks if the order exists (authentication might be fine) but doesn't verify if the logged-in user owns that order. Always check: does this user have permission to access this resource?"
        }
      ]
    }
  ];

  // Use generated curriculum if available, otherwise use static
  const modules = generatedModules.length > 0 ? generatedModules : staticModules;

  const handleQuizSubmit = () => {
    const quiz = dynamicQuiz || modules[currentModule].quiz;
    const score = quiz.reduce((acc, q, idx) => {
      return acc + (quizAnswers[idx] === q.correct ? 1 : 0);
    }, 0);

    const percentage = Math.round((score / quiz.length) * 100);
    setModuleScores({ ...moduleScores, [currentModule]: percentage });
    setShowResults(true);
  };

  const generateAIQuiz = async () => {
    setIsGenerating(true);
    setLoadingProgress(0);

    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + Math.random() * 15, 95));
    }, 400);

    try {
      const moduleContent = modules[currentModule].pages.map(p => p.content).join('\n\n');
      const prompt = `Based on this module content about ${modules[currentModule].title}, generate 3 challenging scenario-based quiz questions. Return ONLY valid JSON in this exact format:
[{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}]

Content:
${moduleContent.slice(0, 3000)}`;

      const response = await fetch('/api/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      const quizData = JSON.parse(data.content[0].text);

      setDynamicQuiz(quizData);
      setQuizAnswers({});
      setShowResults(false);
      setLoadingProgress(100);

      setTimeout(() => {
        clearInterval(progressInterval);
        setIsGenerating(false);
        setLoadingProgress(0);
      }, 500);
    } catch (error) {
      console.error('Error generating quiz:', error);
      clearInterval(progressInterval);
      setIsGenerating(false);
      setLoadingProgress(0);
      alert('Error generating quiz. Please try again.');
    }
  };

  const generateReviewMaterial = async () => {
    const quiz = dynamicQuiz || modules[currentModule].quiz;
    const wrongAnswers = quiz.filter((q, idx) => quizAnswers[idx] !== q.correct);

    if (wrongAnswers.length === 0) {
      alert('Perfect score! No review needed.');
      return;
    }

    setIsGenerating(true);
    setLoadingProgress(0);

    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + Math.random() * 12, 95));
    }, 350);

    try {
      const prompt = `A student got these questions wrong. Provide clear explanations and additional examples to help them understand. Keep it conversational and educational.

Wrong answers:
${wrongAnswers.map(q => `Q: ${q.question}\nCorrect: ${q.options[q.correct]}\nExplanation: ${q.explanation}`).join('\n\n')}`;

      const response = await fetch('/api/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      setReviewMaterial(data.content[0].text);
      setLoadingProgress(100);

      setTimeout(() => {
        clearInterval(progressInterval);
        setIsGenerating(false);
        setLoadingProgress(0);
      }, 500);
    } catch (error) {
      console.error('Error generating review:', error);
      clearInterval(progressInterval);
      setIsGenerating(false);
      setLoadingProgress(0);
      alert('Error generating review material. Please try again.');
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages([...chatMessages, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsGenerating(true);
    setChatProgress(0);

    const progressInterval = setInterval(() => {
      setChatProgress(prev => Math.min(prev + Math.random() * 10, 95));
    }, 300);

    try {
      const moduleContext = `Current module: ${modules[currentModule].title}\nContent: ${modules[currentModule].pages.map(p => p.content).join('\n').slice(0, 2000)}`;

      const prompt = `You are a helpful web development tutor. Answer this question based on the current module context. Be concise and educational.

Context:
${moduleContext}

Question: ${userMessage}`;

      const response = await fetch('/api/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      const assistantMessage = data.content[0].text;

      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      setChatProgress(100);

      setTimeout(() => {
        clearInterval(progressInterval);
        setIsGenerating(false);
        setChatProgress(0);
      }, 500);
    } catch (error) {
      console.error('Error sending message:', error);
      clearInterval(progressInterval);
      setIsGenerating(false);
      setChatProgress(0);
      alert('Error sending message. Please try again.');
    }
  };

  const currentModuleData = modules[currentModule];
  const currentPageData = currentModuleData.pages[currentPage];
  const quiz = dynamicQuiz || currentModuleData.quiz;

  // Input form component for curriculum generation
  const InputFormComponent = () => (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Create Your Custom Curriculum
        </h1>
        <p className="text-gray-600 mb-6">
          Describe what you want to learn, and AI will generate a complete interactive course with lessons, code examples, and quizzes.
        </p>

        {/* Examples */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-semibold text-blue-900 mb-2">Examples:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• "I want to learn React hooks, including useState, useEffect, useContext, and custom hooks"</li>
            <li>• "Teach me SQL from basics to joins, subqueries, and optimization"</li>
            <li>• "Machine learning with Python: numpy, pandas, scikit-learn, and neural networks"</li>
          </ul>
        </div>

        {generationError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{generationError}</p>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            What do you want to learn?
          </label>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Describe the topics, skills, or technologies you want to master..."
            className="w-full h-40 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            disabled={generatingCurriculum}
          />
        </div>

        <button
          onClick={generateCurriculum}
          disabled={generatingCurriculum || !userInput.trim()}
          className="w-full px-6 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {generatingCurriculum ? 'Generating Curriculum...' : 'Generate Curriculum'}
        </button>

        {generatingCurriculum && (
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-indigo-600 h-4 rounded-full transition-all duration-300"
                style={{width: curriculumProgress + '%'}}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2 text-center">
              {Math.round(curriculumProgress)}% - {generationStatus || 'Preparing...'}
              <br/>
              <span className="text-xs">{generatedModules.length > 0 ? `${generatedModules.length}/10 modules complete` : 'This will take a few minutes'}</span>
            </p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-600 mb-3">Or try the default web development curriculum</p>
          <button
            onClick={() => {
              setCurriculumGenerated(false);
              setShowInputForm(false);
            }}
            className="px-6 py-2 text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50"
          >
            View Default Curriculum
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {showInputForm ? (
        <InputFormComponent />
      ) : (
        <>
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Web Development Curriculum</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetToInputForm}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              New Curriculum
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <MessageCircle size={20} />
              Chat Assistant
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Module Menu */}
        {showMenu && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {modules.map((module, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentModule(idx);
                    setCurrentPage(0);
                    setShowQuiz(false);
                    setShowResults(false);
                    setQuizAnswers({});
                    setDynamicQuiz(null);
                    setShowMenu(false);
                  }}
                  className={'px-4 py-3 rounded-lg text-left transition-colors ' + (currentModule === idx ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200')}
                >
                  <div className="font-semibold">{module.title}</div>
                  {moduleScores[idx] !== undefined && (
                    <div className="text-sm mt-1">Score: {moduleScores[idx]}%</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Review Material */}
        {reviewMaterial && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-indigo-600">Personalized Review</h2>
              <button onClick={() => setReviewMaterial(null)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: reviewMaterial.replace(/\n/g, '<br/>') }} />
            </div>
          </div>
        )}

        {/* Chat Window */}
        {showChat && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-indigo-600">AI Chat Assistant</h2>
              <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="border rounded-lg p-4 h-96 overflow-y-auto mb-4 bg-gray-50">
              {chatMessages.length === 0 ? (
                <p className="text-gray-500 text-center mt-20">Ask me anything about {currentModuleData.title}!</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={'mb-4 ' + (msg.role === 'user' ? 'text-right' : 'text-left')}>
                    <div className={'inline-block px-4 py-2 rounded-lg max-w-md ' + (msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800')}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isGenerating && chatProgress > 0 && (
                <div className="mb-4">
                  <div className="inline-block bg-gray-200 px-4 py-2 rounded-lg">
                    <div className="w-48 bg-gray-300 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{width: chatProgress + '%'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type your question..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isGenerating}
              />
              <button
                onClick={sendChatMessage}
                disabled={isGenerating || !chatInput.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{currentModuleData.title}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Page {currentPage + 1} of {currentModuleData.pages.length}</span>
              {moduleScores[currentModule] !== undefined && (
                <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold">
                  Score: {moduleScores[currentModule]}%
                </span>
              )}
            </div>
          </div>

          {!showQuiz ? (
            <>
              <div className="mb-8">
                <h3 className="text-2xl font-semibold mb-4">{currentPageData.title}</h3>
                <div className="prose max-w-none text-gray-700 leading-relaxed">
                  {renderContent(currentPageData.content)}
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} />
                  Previous
                </button>

                {currentPage === currentModuleData.pages.length - 1 ? (
                  <button
                    onClick={() => {
                      setShowQuiz(true);
                      setQuizAnswers({});
                      setShowResults(false);
                      setDynamicQuiz(null);
                    }}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                  >
                    Take Quiz
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Next
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div>
              <h3 className="text-2xl font-semibold mb-6">Quiz: {currentModuleData.title}</h3>

              {!showResults ? (
                <>
                  {quiz.map((q, qIdx) => (
                    <div key={qIdx} className="mb-8 p-6 bg-gray-50 rounded-lg">
                      <p className="font-semibold mb-4 text-lg">{qIdx + 1}. {q.question}</p>
                      <div className="space-y-3">
                        {q.options.map((option, oIdx) => (
                          <label key={oIdx} className="flex items-start gap-3 cursor-pointer hover:bg-gray-100 p-3 rounded-lg transition-colors">
                            <input
                              type="radio"
                              name={'q' + qIdx}
                              checked={quizAnswers[qIdx] === oIdx}
                              onChange={() => setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                              className="mt-1"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-4">
                    <button
                      onClick={handleQuizSubmit}
                      disabled={Object.keys(quizAnswers).length !== quiz.length}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                    >
                      Submit Quiz
                    </button>
                    <button
                      onClick={generateAIQuiz}
                      disabled={isGenerating}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                    >
                      {isGenerating ? 'Generating...' : 'New AI Quiz'}
                    </button>
                  </div>

                  {isGenerating && loadingProgress > 0 && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-purple-600 h-3 rounded-full transition-all duration-300" style={{width: loadingProgress + '%'}}></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Generating quiz... {Math.round(loadingProgress)}%</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-6 p-6 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                    <h4 className="text-xl font-bold mb-2">Your Score: {moduleScores[currentModule]}%</h4>
                    <p className="text-gray-700">
                      {moduleScores[currentModule] >= 80 ? 'Excellent work!' : moduleScores[currentModule] >= 60 ? 'Good effort!' : 'Keep studying!'}
                    </p>
                  </div>

                  {quiz.map((q, qIdx) => {
                    const isCorrect = quizAnswers[qIdx] === q.correct;
                    return (
                      <div key={qIdx} className={'mb-6 p-6 rounded-lg border-2 ' + (isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')}>
                        <p className="font-semibold mb-3">{qIdx + 1}. {q.question}</p>
                        <p className={'mb-2 ' + (isCorrect ? 'text-green-700' : 'text-red-700')}>
                          Your answer: {q.options[quizAnswers[qIdx]]} {isCorrect ? '✓' : '✗'}
                        </p>
                        {!isCorrect && (
                          <p className="mb-2 text-green-700">Correct answer: {q.options[q.correct]}</p>
                        )}
                        <p className="text-gray-700 mt-3 pt-3 border-t border-gray-300">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      </div>
                    );
                  })}

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setShowQuiz(false);
                        setShowResults(false);
                        setQuizAnswers({});
                        setDynamicQuiz(null);
                      }}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Back to Content
                    </button>
                    <button
                      onClick={() => {
                        setShowResults(false);
                        setQuizAnswers({});
                        setDynamicQuiz(null);
                      }}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Retake Quiz
                    </button>
                    {moduleScores[currentModule] < 100 && (
                      <button
                        onClick={generateReviewMaterial}
                        disabled={isGenerating}
                        className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {isGenerating ? 'Generating...' : 'Review Material'}
                      </button>
                    )}
                  </div>

                  {isGenerating && loadingProgress > 0 && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-amber-600 h-3 rounded-full transition-all duration-300" style={{width: loadingProgress + '%'}}></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Generating review material... {Math.round(loadingProgress)}%</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

export default App;
