# Bible Lyrics Prompter

A real-time church presentation system for displaying Bible verses, song lyrics, and service programs. Control from your phone, display on the projector.

## Features

- 📖 **Offline KJV Bible** with searchable book selection
- 🎵 **Multi-slide lyrics** management
- 📋 **Service program** order display
- 🎨 **Multiple themes** (Dark, Light, Worship, Nature)
- 📱 **Mobile-first control panel**
- 🔄 **Real-time sync** via WebSockets

## Tech Stack

- Node.js + Express
- Socket.io for real-time communication
- Vanilla JavaScript (no frameworks)
- Modern CSS with gradient themes

## Quick Start

```bash
npm install
npm start
```

Open:
- Control Panel: `http://localhost:3000/control.html`
- Display Screen: `http://localhost:3000/display.html`

## Deployment

Designed for Render.com (supports persistent WebSocket connections).

### Deploy to Render:
1. Push this repo to GitHub
2. Create new Web Service on Render
3. Connect your GitHub repo
4. Render auto-detects Node.js and runs `npm start`
5. Access control panel at: `https://your-app.onrender.com/control.html`

## Project Structure

```
├── server.js           # Express + Socket.io server
├── data/
│   └── kjv.json       # Full King James Bible
├── public/
│   ├── index.html     # Landing page
│   ├── control.html   # Remote control interface
│   └── display.html   # Projector display
└── package.json
```

## License

MIT
