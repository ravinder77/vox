# Vox Backend

Express backend for the chat UI in `frontend/`.

## Features

- Demo auth: login, signup, forgot password, logout, current user
- Conversations: list, search, filter, unread reset, detail, shared media
- Messages: fetch history, send text/image/file messages, reply metadata
- Reactions: add/remove emoji reactions on messages
- Typing state: update and inspect typing indicator state
- Calls: start, inspect, and end conversation calls
- Notifications: mute/unmute per conversation
- Bootstrap endpoint: fetch app-ready payload in one request

## Run

1. Install dependencies:

```bash
npm install
```

2. Update the existing `.env` file and configure Postgres:

3. Generate Prisma client, create tables, and seed demo data:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

4. Start the server:

```bash
npm run dev
```

The API defaults to `http://localhost:4000`.

## Database

The backend uses PostgreSQL via Prisma. Set `DATABASE_URL` and a strong `JWT_SECRET` in `.env` before running the Prisma commands.

Conversations are scoped to authenticated participants. The seed gives both demo users access to the demo chats; newly created users start with an empty workspace until conversations are assigned to them.

Tables created from the Prisma schema:

- `users`
- `conversations`
- `messages`
- `message_reactions`
- `conversation_media`
- `typing_states`
- `conversation_calls`

## Main Endpoints

- `GET /health`
- `GET /api/bootstrap`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/forgot-password`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/conversations`
- `GET /api/conversations/:conversationId`
- `POST /api/conversations/:conversationId/read`
- `PATCH /api/conversations/:conversationId/notifications`
- `GET /api/conversations/:conversationId/media`
- `GET /api/conversations/:conversationId/messages`
- `POST /api/conversations/:conversationId/messages`
- `POST /api/conversations/:conversationId/messages/:messageId/reactions`
- `DELETE /api/conversations/:conversationId/messages/:messageId/reactions`
- `POST /api/conversations/:conversationId/typing`
- `GET /api/conversations/:conversationId/typing`
- `POST /api/conversations/:conversationId/call/start`
- `POST /api/conversations/:conversationId/call/end`
- `GET /api/conversations/:conversationId/call`
