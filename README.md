# AI Chat - A ChatGPT-like Application

A full-stack, production-ready chat application built with React, Vite, Express, and MongoDB. Features AI-powered conversations with MiniMax-M2.7, personas, templates, tools, PWA support, and more.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![React](https://img.shields.io/badge/react-18.3-blue.svg)

## Features

- 💬 **AI Chat** - Natural conversations with MiniMax-M2.7 model
- 🎭 **Personas** - Custom system prompts for different AI personalities
- 📝 **Templates** - Reusable prompt templates with variables
- 🔧 **Tools** - Web search, calculator, datetime, and more
- 🌙 **Dark/Light Themes** - 5 beautiful theme options
- 📱 **PWA** - Install as a desktop/mobile app
- 🔐 **Authentication** - JWT-based auth with guest mode
- ⚡ **Streaming** - Real-time AI responses
- 📊 **Usage Stats** - Track your chat activity
- 📁 **Folders** - Organize conversations
- 📤 **Export** - Export chats as Markdown, PDF, or plain text
- ⌨️ **Keyboard Shortcuts** - Full keyboard navigation

## Tech Stack

| Frontend | Backend | Database | AI |
|----------|---------|----------|-----|
| React 18 | Express | MongoDB | MiniMax-M2.7 |
| Vite | Node.js | Mongoose | Anthropic API |
| Tailwind CSS | JWT | | |
| Framer Motion | Helmet | | |
| react-window | | | |

## Project Structure

```
chatgpt-like/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Header.jsx
│   │   │   ├── SidebarContent.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── InputBar.jsx
│   │   │   ├── WelcomeScreen.jsx
│   │   │   ├── TypingIndicator.jsx
│   │   │   └── ... (40+ components)
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/             # Custom hooks
│   │   ├── utils/             # Utilities
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Entry point
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── models/           # Mongoose models
│   │   │   ├── User.js
│   │   │   ├── Conversation.js
│   │   │   └── ...
│   │   ├── routes/            # Express routes
│   │   │   ├── auth.js
│   │   │   ├── conversations.js
│   │   │   ├── models.js
│   │   │   └── ...
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.js
│   │   │   ├── rateLimit.js
│   │   │   ├── errorHandler.js
│   │   │   └── sanitize.js
│   │   ├── utils/             # Utilities
│   │   └── index.js           # Entry point
│   ├── package.json
│   └── .env
│
├── .gitignore
├── README.md
└── package.json              # Root package (optional)
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- MiniMax API key (or Anthropic-compatible API key)

### Installation

1. **Clone the repository**
   ```bash
   cd chatgpt-like
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd client
   npm install
   ```

4. **Configure environment variables**

   Create `server/.env`:
   ```env
   # Server
   PORT=5000
   NODE_ENV=development

   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/chatapp
   # Or for Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp

   # JWT
   JWT_SECRET=your-super-secret-key-change-in-production
   JWT_EXPIRES_IN=30d

   # AI API (MiniMax Anthropic-compatible)
   ANTHROPIC_API_KEY=your-minimax-api-key
   ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
   ANTHROPIC_SMALL_FAST_MODEL=MiniMax-M2.7-highspeed

   # Client URL (for CORS)
   CLIENT_URL=http://localhost:5173
   ```

   Create `client/.env`:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

### Running the Application

**Development mode (recommended):**

```bash
# Terminal 1 - Start server with auto-restart
cd server
npm run dev

# Terminal 2 - Start client with hot reload
cd client
npm run dev
```

**Production mode:**

```bash
# Build client
cd client
npm run build

# Start server
cd server
npm start
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/api/health

## Environment Variables

### Server (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/chatapp |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | JWT expiration | 30d |
| `ANTHROPIC_API_KEY` | AI API key | (required) |
| `ANTHROPIC_BASE_URL` | AI API base URL | https://api.minimax.io/anthropic |
| `ANTHROPIC_SMALL_FAST_MODEL` | Fast model for title generation | MiniMax-M2.7-highspeed |
| `CLIENT_URL` | Frontend URL for CORS | http://localhost:5173 |

### Client (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | http://localhost:5000 |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/guest` - Login as guest
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Conversations
- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation with messages
- `PATCH /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/conversations/:id/messages` - Send message (streaming)
- `GET /api/conversations/search?q=` - Search conversations

### Other
- `GET /api/models` - List available AI models
- `GET /api/system-prompts` - List personas
- `GET /api/templates` - List prompt templates
- `GET /api/health` - Health check

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Search conversations |
| `Ctrl+N` | New conversation |
| `Ctrl+[` / `Ctrl+]` | Previous/next conversation |
| `Ctrl+Enter` | Send message |
| `Ctrl+/` | Focus input |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+,` | Open settings |
| `?` | Show shortcuts (not in input) |
| `R` | Regenerate response |
| `Esc` | Close modal/panel |

## Deployment

### Docker (Recommended)

```dockerfile
# docker-compose.yml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  server:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/chatapp
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - mongodb

  client:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - server

volumes:
  mongodb_data:
```

### Manual Deployment

1. Set up MongoDB (local or Atlas)
2. Build client: `cd client && npm run build`
3. Configure server environment variables
4. Start server: `cd server && npm start`

## Development

### Running Tests

```bash
# Server tests (if configured)
cd server
npm test

# Client tests (if configured)
cd client
npm test
```

### Code Quality

```bash
# Lint
cd client && npm run lint
cd server && npm run lint

# Format with Prettier
cd client && npm run format
```

## Troubleshooting

**MongoDB connection issues:**
- Ensure MongoDB is running
- Check `MONGODB_URI` is correct
- For Atlas: whitelist your IP address

**AI API errors:**
- Verify `ANTHROPIC_API_KEY` is valid
- Check `ANTHROPIC_BASE_URL` matches your provider
- Ensure API key has sufficient credits

**CORS errors:**
- Verify `CLIENT_URL` matches your frontend URL
- For production: set correct domain in environment variable

## License

MIT License - feel free to use this project for personal or commercial applications.

## Acknowledgments

- [MiniMax](https://minimax.io/) - AI model provider
- [Anthropic](https://anthropic.com/) - API design inspiration
- [Vite](https://vitejs.dev/) - Fast build tool
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library