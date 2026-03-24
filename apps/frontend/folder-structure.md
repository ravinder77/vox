# Vox Chat App — Folder Structure

```
vox-chat/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.jsx              # Main sidebar container
│   │   │   ├── ConversationList.jsx     # Scrollable list of chats
│   │   │   ├── ConversationItem.jsx     # Single chat row (avatar, preview, badge)
│   │   │   ├── SearchBar.jsx            # Fuzzy-search input
│   │   │   ├── NavTabs.jsx              # All / DMs / Groups tabs
│   │   │   └── SidebarFooter.jsx        # Current user profile + settings
│   │   │
│   │   ├── Chat/
│   │   │   ├── ChatWindow.jsx           # Full chat area orchestrator
│   │   │   ├── ChatHeader.jsx           # Name, status, action buttons
│   │   │   ├── MessageList.jsx          # Virtualized message feed
│   │   │   ├── MessageBubble.jsx        # Polymorphic bubble (text/image/file)
│   │   │   ├── MessageActions.jsx       # Reply / React / Copy popover
│   │   │   ├── ReactionBar.jsx          # Emoji reaction pills
│   │   │   ├── TypingIndicator.jsx      # Animated dots
│   │   │   ├── DateDivider.jsx          # "Today", "Yesterday" separators
│   │   │   ├── ReplyBanner.jsx          # Replying-to preview strip
│   │   │   ├── Composer.jsx             # Textarea + toolbar + send button
│   │   │   ├── EmojiPicker.jsx          # Floating emoji grid
│   │   │   └── CallBanner.jsx           # Active call timer strip
│   │   │
│   │   ├── RightPanel/
│   │   │   ├── RightPanel.jsx           # Contact info panel container
│   │   │   ├── ProfileCard.jsx          # Avatar, name, role, action buttons
│   │   │   ├── ContactInfo.jsx          # Email, location, local time rows
│   │   │   ├── SharedMedia.jsx          # 3-column media thumbnail grid
│   │   │   └── NotificationToggle.jsx   # Mute / notification settings
│   │   │
│   │   └── UI/
│   │       ├── Avatar.jsx               # Reusable avatar with status dot
│   │       ├── Badge.jsx                # Unread count pill
│   │       ├── IconButton.jsx           # Small icon button wrapper
│   │       ├── Toast.jsx                # Snackbar notification
│   │       └── Toggle.jsx               # On/Off switch
│   │
│   ├── hooks/
│   │   ├── useMessages.js               # Message state + send/receive logic
│   │   ├── useTyping.js                 # Typing indicator debounce
│   │   ├── useCall.js                   # Call state + timer
│   │   ├── useSearch.js                 # Conversation filter logic
│   │   └── usePresence.js              # Online / away / offline status
│   │
│   ├── context/
│   │   ├── ChatContext.jsx              # Active conversation + message store
│   │   ├── UserContext.jsx              # Authenticated user profile
│   │   └── ThemeContext.jsx             # Dark / light theme toggle
│   │
│   ├── data/
│   │   ├── conversations.js             # Mock conversation list
│   │   ├── messages.js                  # Mock message history per conversation
│   │   └── users.js                     # Mock user profiles
│   │
│   ├── utils/
│   │   ├── formatTime.js                # Relative time strings (2m, 1h, Tue…)
│   │   ├── groupMessages.js             # Group messages by date for dividers
│   │   └── generateAvatar.js            # Initials + gradient color from name
│   │
│   ├── styles/
│   │   ├── globals.css                  # CSS variables, resets, scrollbars
│   │   └── animations.css              # Keyframes (msgIn, typingBounce, etc.)
│   │
│   ├── App.jsx                          # Root layout: Sidebar + Chat + Panel
│   └── main.jsx                         # ReactDOM.createRoot entry point
│
├── .env                                  # VITE_API_URL, VITE_WS_URL
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Key Design Decisions

| Area | Choice | Reason |
|------|--------|--------|
| **Font** | Syne (display) + DM Sans (body) | Distinctive, editorial feel |
| **Theme** | Dark-first with CSS variables | Easy theming, low eye-strain |
| **State** | Context API + custom hooks | Lightweight, no Redux overhead |
| **Messages** | Virtualized list | Perf with 1000s of messages |
| **Real-time** | WebSocket hook | Low-latency typing + delivery |
| **Styling** | CSS variables + utility classes | Consistent tokens, no bloat |

## Features Implemented

- ✅ Conversation list with search & tabs (All / DMs / Groups)
- ✅ Text, image, and file messages
- ✅ Message actions: reply, react, copy
- ✅ Emoji reactions with counts
- ✅ Reply-to banner with quoted preview
- ✅ Auto-resize composer textarea
- ✅ Typing indicator (animated dots)
- ✅ Read receipts (✓ / ✓✓)
- ✅ Voice call banner with live timer
- ✅ Contact info right panel
- ✅ Shared media grid
- ✅ Notification mute toggle
- ✅ Online / away / offline presence
- ✅ Toast notification system
- ✅ Unread message badges
- ✅ Date dividers
