# PotatoChat

A Discord-like chat application with real-time messaging, servers, channels, direct messages, polls, roles & permissions, private channels, and image sharing.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Tailwind](https://img.shields.io/badge/Tailwind-3-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Railway-blue)

## Features

- **Servers & Channels** — Create servers, organize channels, invite members. Three roles: OWNER, ADMIN, GUEST.
- **Private Channels** — Public/private toggle on creation; permissions-based access with member checklist.
- **Real-time Messaging** — Messages update every 2 seconds via polling. Base64-encoded storage.
- **Polls** — Create polls via the "+" action menu. Vote, re-vote, view live results, see who voted.
- **Image Sharing** — Auto-detect image URLs. Photo upload modal (file picker + URL extraction). Hover-to-play GIFs with canvas-based first-frame preview.
- **@Mentions** — Autocomplete, @everyone support, notification sounds, highlighted mentions.
- **Direct Messages** — 1-on-1 conversations with profile access.
- **User Profiles** — Gradient banner, avatar, username, bio. Own profile supports inline editing.
- **Roles & Permissions** — OWNER/ADMIN/GUEST. Role-gated channel management. Admin commands via `/admin` and `/unadmin`.
- **Server Hierarchy** — Owner displayed with crown, expandable role sections in server settings.
- **Message Deletion** — Delete your own messages via three-dot menu.
- **Command Autocomplete** — Slash commands with keyboard navigation, role-aware help text.
- **Superuser** — User "hi" bypasses all role restrictions.

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Prisma ORM)
- **Auth**: Custom JWT-based authentication (HTTP-only cookies)

## Quick Start

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |

## Project Structure

```
PotatoChat/
├── prisma/
│   └── schema.prisma          # Database models
├── src/
│   ├── app/
│   │   ├── api/               # REST API routes
│   │   │   ├── auth/          # Login/register/me
│   │   │   ├── channels/      # CRUD + permissions
│   │   │   ├── messages/      # Message CRUD
│   │   │   ├── polls/         # Poll CRUD + vote + results
│   │   │   ├── servers/       # Server CRUD, members, roles, delete
│   │   │   └── users/         # Profile update, user lookup
│   │   ├── dm/                # DM pages
│   │   └── server/            # Server pages
│   ├── components/
│   │   ├── chat/              # ChatWindow, PollMessage, PollCreator, PhotoUploadModal, UserContextMenu, CommandAutocomplete
│   │   ├── layout/            # AppShell, sidebar, member list
│   │   ├── modals/            # ServerSettingsModal, ChannelModal, ChannelPermissionsModal, UserProfileModal
│   │   └── utils/             # GifImage, LoadingSpinner
│   ├── context/
│   │   └── AuthContext.tsx     # Global auth state
│   └── lib/
│       ├── auth.ts            # JWT helpers
│       └── prisma.ts          # Prisma client
└── public/
```

## License

MIT
