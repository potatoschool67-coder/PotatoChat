# PotatoChat

A Discord-like chat application with real-time messaging, servers, channels, and direct messages. Features message encryption, @mentions, image sharing, and private server support.

![PotatoChat](https://img.shields.io/badge/Next.js-16-black) ![Tailwind](https://img.shields.io/badge/Tailwind-3-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Railway-blue)

## Features

- **Servers & Channels** - Create servers, organize channels, invite members
- **Real-time Messaging** - Messages update every 2 seconds via polling
- **Message Encryption** - All messages stored as base64 encoded
- **@Mentions** - Autocomplete for users, @everyone support, notification sounds
- **Image Sharing** - Automatic detection of image URLs in messages
- **Private Servers** - Password-protected servers with optional join requirements
- **Direct Messages** - 1-on-1 encrypted conversations
- **Message Deletion** - Delete your own messages with three-dot menu
- **Command Autocomplete** - Slash commands with keyboard navigation

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Prisma ORM)
- **Auth**: Custom JWT-based authentication

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Railway

### Prerequisites

- [Railway](https://railway.app) account
- [GitHub](https://github.com) repository

### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create Railway Project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL Database**
   - In Railway dashboard, click "New" → "Database" → "PostgreSQL"
   - Wait for it to provision

4. **Configure Environment Variables**
   - Go to your Railway project settings
   - Add these variables:
     ```
     DATABASE_URL=<your-postgres-connection-string>
     JWT_SECRET=<generate-a-secure-random-string>
     ```

5. **Deploy**
   - Railway will automatically detect Next.js and deploy
   - Wait for build to complete
   - Click the generated URL to open your app

6. **Run Database Migrations**
   - Go to your Railway project
   - Click "Runtime" → "New"
   - Select your app service
   - Run: `npx prisma generate && npx prisma db push`

## Deployment to GitHub Codespaces

### Prerequisites

- GitHub account
- Repository pushed to GitHub

### Steps

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/PotatoChat.git
   git push -u origin main
   ```

2. **Open in Codespaces**
   - Go to your repository on GitHub
   - Click "Code" button
   - Select "Create codespace on main"
   - Wait for environment to set up

3. **Database Setup**
   - Codespaces provides 150 free hours/month
   - For database, you have two options:
   
   **Option A: Use Railway (Recommended)**
   - Create Railway PostgreSQL as above
   - In Codespaces terminal, run:
     ```bash
     export DATABASE_URL="your-railway-connection-string"
     export JWT_SECRET="your-secret"
     npx prisma generate
     npx prisma db push
     ```
   
   **Option B: Use In-IDE Database**
   - Some GitHub accounts include database addon
   - Check your Codespaces settings

4. **Run the App**
   ```bash
   npm run dev
   ```

5. **Access the App**
   - Click "Ports" in the Codespaces terminal
   - Forward port 3000
   - Click the globe icon to open in browser

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |

## Project Structure

```
PotatoChat/
├── prisma/
│   └── schema.prisma      # Database models
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── dm/           # DM pages
│   │   └── server/       # Server pages
│   ├── components/       # React components
│   ├── context/         # Auth context
│   └── lib/             # Utilities
└── public/              # Static assets
```

## Admin Commands

The user "hi" has access to admin commands in DMs:
- `/ping` - Check bot status
- `/potatobot` - Control PotatoBot
- `/servers` - List all servers
- `/users` - List all users
- `/ban` / `/unban` - Ban/unban users
- `/clear` - Clear messages

## License

MIT