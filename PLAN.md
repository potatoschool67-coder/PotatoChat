# PotatoChat — Development Plan

## Architecture

- **Frontend**: Next.js 16, React, Tailwind CSS
- **Backend**: Next.js API Routes (REST)
- **Database**: PostgreSQL (Railway) via Prisma ORM
- **Auth**: Custom JWT stored in HTTP-only cookies
- **Real-time**: 2-second polling (no WebSockets)

## Database Models (Prisma)

- **User** — id, username, avatar, bio, status, createdAt
- **Server** — id, name, avatar, createdAt
- **ServerMember** — userId + serverId (compound unique), role (OWNER/ADMIN/GUEST)
- **Channel** — id, name, serverId, isPrivate (default false)
- **ChannelPermission** — channelId + userId (compound unique)
- **Message** — id, content (base64), userId, channelId/dmChannelId, createdAt, pollId (optional 1:1)
- **Poll** — id, question, messageId
- **PollOption** — id, pollId, text
- **Vote** — userId + optionId (compound unique)
- **DMChannel** — id, createdAt
- **DMChannelMember** — dmChannelId + userId (compound unique)

## Feature List

### Auth & Users
- Register/login with JWT
- Auth context providing current user globally
- Profile bio editing via inline textarea in unified profile modal
- UserProfileModal: gradient banner, avatar, username, bio (editable for self)

### Servers
- Create / Join / List servers
- Server deletion (OWNER or user "hi" only)
- Server settings modal with Overview + Hierarchy tabs
- Hierarchy tab: owner shown with crown avatar, expandable role sections (OWNER/ADMIN/GUEST) with member lists, scroll-limited

### Channels
- Create channels with name (Public/Private toggle)
- Private channels: member multi-select checklist on creation; OWNER/ADMIN/"hi" auto-added
- Channel list filtering: OWNER/ADMIN/"hi" see all; GUEST sees public + permitted private
- Channel permissions modal: public shows info message; private shows member checklist (OWNER/ADMIN/"hi" only can edit)
- Three-dot menu on channels: Delete (OWNER/ADMIN/"hi"), Permissions
- Lock icon next to private channel names
- Channel management gated by role (create/PUT/DELETE require OWNER/ADMIN/"hi")

### Messages
- Send messages (base64-encoded content stored, decoded on display)
- Message polling every 2 seconds
- Poll messages: inline poll UI with vote buttons and live counts
- Polls: create via "+" action menu → PollCreator; vote with switching (re-vote changes option); results show live counts; "See who voted" reveals list of voters
- Image URLs auto-rendered with GifImage component
- GifImage: non-GIF → normal `<img>`; GIF → canvas-extracted first frame as static preview + blue "GIF" + "hover" badges, actual GIF hidden until hover (display: none stops animation), CORS-safe
- Photo upload modal: Upload tab (file picker, 5MB limit, base64 data URL) + URL tab (auto-extracts src from HTML/Markdown/BBCode)
- "@" button for @mentions, autocomplete with keyboard nav, @everyone support, notification sounds, highlighted mentions
- Message deletion from three-dot menu
- UserContextMenu: click username/avatar → popover with "Profile" button → UserProfileModal

### Direct Messages
- DM channels with members
- Profile button in user menu (AppShell, dm page, dm/[userId])
- UserContextMenu + UserProfileModal on message user click in DMs

### Roles & Permissions
- Three roles: OWNER, ADMIN, GUEST
- Server creator gets OWNER at creation
- Admin commands: `/admin @user` and `/unadmin @user` (OWNER or "hi" only)
- Command autocomplete is role-aware; help text varies by role
- GUEST cannot see admin commands, cannot manage channels

### Member Management
- Right sidebar shows server members
- Current user always sorted to top
- Private channel member sidebar: only shows users with ChannelPermission + OWNERs + ADMINs; header shows "Members - N (filtered)"
- Click member → UserProfileModal
- Kick/Delete buttons for OWNER/ADMIN

### Superuser
- User "hi" bypasses all role checks (sees all channels, can run all admin commands, manage channels)
- `/clear` command available to "hi" in DMs

### Removed
- PotatoBot / Ollama integration — fully removed
