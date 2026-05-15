# Vox Chat Frontend Structure

The frontend is a Vite, React, and TypeScript app.

```text
frontend/
├── index.html
├── nginx.conf
├── package.json
├── vite.config.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── Auth/
│   │   ├── Chat/
│   │   ├── RightPanel/
│   │   ├── Sidebar/
│   │   └── UI/
│   ├── hooks/
│   │   └── useChatApp.ts
│   ├── lib/
│   │   ├── api.ts
│   │   └── socket.ts
│   ├── styles/
│   ├── test/
│   ├── types/
│   └── utils/
```

## Local Configuration

Create `frontend/.env` from `frontend/.env.example`.

```bash
VITE_API_URL=http://localhost:4000/api
VITE_CSRF_COOKIE_NAME=vox_csrf
```

## Commands

```bash
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

## Notes

- Component tests live next to the components they cover.
- Shared test helpers live in `src/test`.
- API calls use `src/lib/api.ts`.
- Socket.IO setup lives in `src/lib/socket.ts`.
