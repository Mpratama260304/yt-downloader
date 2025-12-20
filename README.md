# 🎬 YouTube Downloader v5.1.0 - Corruption Fix Update

A modern, production-ready web application for downloading YouTube videos using yt-dlp. Features **automatic real-time cookie fetching** from an external URL, **FFprobe validation** for download integrity, and **auto-fallback formats** to prevent corruption errors.

**🚀 Designed for Phala Cloud and VPS platforms that only support `docker-compose.yml`**

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)
![DaisyUI](https://img.shields.io/badge/DaisyUI-4.12-5A0EF8?style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## ✨ What's New in v5.1.0

### 🛡️ Corruption Fix Update (Critical)
This update addresses frequent "Video file may be corrupted" errors and long "Connecting to server..." delays.

#### Problem Solved
- **Corruption errors** when downloading "Best Quality (Video + Audio)" formats
- **Long connection delays** ending in timeout or corruption errors
- **Incomplete merges** of video and audio streams

#### Solutions Implemented
- **FFprobe Validation** - Every downloaded file is validated for playability before delivery
- **Auto-Fallback Formats** - If corruption is detected, automatically retries with safer formats (720p → 480p → best)
- **Cookies Caching** - 30-second cache reduces external URL calls for faster subsequent requests
- **Optimized yt-dlp Args** - Increased retries, better FFmpeg flags, socket timeouts
- **Enhanced Timeout Handling** - 30s connection timeout, 5min download timeout with proper cleanup
- **Granular Progress Updates** - New "Validating" phase shows when integrity check is running

### 🍪 Auto-Cookies System (v5.0)
- **Real-time Cookie Sync** - Fetches fresh cookies from external URL
- **Smart Caching** - 30-second TTL cache for faster requests
- **Auto-Refresh** - External source refreshes cookies every ~30 seconds
- **Smart Fallback** - Uses consent cookies if fetch fails
- **Zero Maintenance** - No need to manually upload/rotate cookies

### Removed Features (from v5.0)
- ❌ Cookies Importer page
- ❌ Cookies Manager page
- ❌ LED indicators for cookie status
- ❌ Manual cookie upload
- ❌ Cookie rotation from database

## ✨ Features

### 🎛️ Admin Panel
- 🔐 **Secure Authentication** - JWT-based login with bcrypt password hashing
- 📊 **Dashboard** - Real-time statistics including auto-cookies health
- 📜 **History Logs** - Track all fetch/download activity with pagination
- ⚙️ **Site Settings** - Customize site name, description, logo, favicon
- 👤 **Profile Management** - Change password, update admin credentials

### Core Functionality
- 🎬 **Video Downloads** - Download videos in various resolutions (4K, 1080p, 720p, etc.)
- 🎵 **Audio Extraction** - Download audio-only formats (MP3, M4A)
- 📋 **Playlist Support** - Browse and download individual videos from playlists
- 🔄 **Server-Side Proxy** - Downloads are proxied through server with auto-cookies
- 📱 **YouTube Shorts** - Full support for YouTube Shorts
- 🎵 **YouTube Music** - Download from YouTube Music
- 📏 **File Size Display** - Shows estimated file size for each format
- ⬇️ **Progress Tracking** - Real-time download progress via SSE with validation phase

### 2025 Bot Detection Fixes
- 🍪 **Auto-Fetch Cookies** - Fresh cookies from external URL for every request
- 🎭 **Random User-Agent** - Rotation to avoid detection patterns
- 🔐 **Consent Cookies** - Automatic consent bypass fallback
- ⏱️ **Request Throttling** - Avoids triggering rate limits
- 🌍 **Geo Bypass** - Works around regional restrictions
- 📝 **Proper Headers** - Referrer, Accept-Language, etc.

### Modern UI/UX
- 🎨 **Beautiful Design** - Modern interface with DaisyUI components
- 🌙 **Dark/Light Mode** - System-aware theme toggle
- ✨ **Animations** - Smooth Framer Motion animations
- 📱 **Fully Responsive** - Mobile-first design for all devices
- ♿ **Accessible** - ARIA labels, keyboard navigation
- 🔔 **Toast Notifications** - Real-time feedback with react-hot-toast

### Production Ready
- 🐳 **Docker Support** - Multi-stage build, Docker Compose ready
- 💾 **SQLite Database** - Persistent data with drizzle-orm
- 🔒 **Security** - Non-root user, security headers, JWT auth
- 📊 **Health Checks** - Built-in health endpoint
- 📝 **Logging** - Structured logging with winston
- ✅ **Tests** - Jest test suite included
- 🔧 **TypeScript** - Full type safety

## 🍪 Auto-Cookies System (v5.0)

### How It Works

The auto-cookies system fetches fresh YouTube cookies from an external URL on-demand for every API request:

```
┌─────────────┐     POST /api/fetch-info     ┌─────────────┐
│   Browser   │ ───────────────────────────► │   Server    │
└─────────────┘                              └──────┬──────┘
                                                    │
                                                    ▼
                                        ┌───────────────────┐
                                        │  Fetch Cookies    │
                                        │  from External    │
                                        │  URL (5s timeout) │
                                        └─────────┬─────────┘
                                                  │
                              ┌───────────────────┴───────────────────┐
                              │                                       │
                              ▼                                       ▼
                     ┌────────────────┐                    ┌────────────────┐
                     │   Validate &   │                    │   Use Fallback │
                     │ Write Temp File│                    │ Consent Cookies│
                     └────────┬───────┘                    └────────┬───────┘
                              │                                     │
                              └────────────────┬────────────────────┘
                                               │
                                               ▼
                                    ┌───────────────────┐
                                    │   Run yt-dlp      │
                                    │ with --cookies    │
                                    └─────────┬─────────┘
                                              │
                                              ▼
                                    ┌───────────────────┐
                                    │  Cleanup Temp     │
                                    │  Cookie File      │
                                    └───────────────────┘
```

### Configuration

Set the external cookies URL via environment variable:

```bash
COOKIES_URL=https://your-cookies-server.com/cookies.txt
```

Default: `https://amy-subjective-macro-powers.trycloudflare.com/`

### Cookie Format Requirements

The external URL must serve a **Netscape format** cookies file:

```
# Netscape HTTP Cookie File
# https://curl.haxx.se/docs/http-cookies.html

.youtube.com	TRUE	/	TRUE	0	SID	your-sid-cookie-value
.youtube.com	TRUE	/	TRUE	0	HSID	your-hsid-cookie-value
.youtube.com	TRUE	/	TRUE	0	SSID	your-ssid-cookie-value
...
```

### Validation

Cookies are validated using Zod schema:
- Must start with `# Netscape HTTP Cookie File`
- Must contain `.youtube.com` domain cookies
- Invalid format triggers fallback

### Fallback Behavior

If cookie fetch fails (timeout, network error, invalid format):

1. Creates temporary file with consent cookies
2. Logs warning message
3. Continues with limited functionality
4. Toast notification shown to admin

### ⚠️ Important Considerations

1. **External Dependency** - If the cookies URL is unavailable, fallback cookies may trigger bot detection
2. **Caching** - v5.1.0 caches cookies for 30 seconds to reduce external calls (configurable)
3. **Timeout** - 5-second timeout for fetch to prevent blocking
4. **Monitoring** - Watch dashboard stats for failed fetches

## 🛡️ Corruption Fix (v5.1.0)

### How FFprobe Validation Works

After every download completes, the file is validated using FFprobe:

```
┌─────────────────┐     Download Complete     ┌─────────────────┐
│   yt-dlp        │ ────────────────────────► │   FFprobe       │
│   Download      │                           │   Validation    │
└─────────────────┘                           └────────┬────────┘
                                                       │
                              ┌────────────────────────┴────────────────────────┐
                              │                                                 │
                              ▼                                                 ▼
                     ┌────────────────┐                              ┌────────────────┐
                     │   ✅ Valid      │                              │   ❌ Corrupt    │
                     │   Has video &   │                              │   Missing       │
                     │   audio streams │                              │   streams       │
                     └────────┬───────┘                              └────────┬───────┘
                              │                                               │
                              ▼                                               ▼
                     ┌────────────────┐                              ┌────────────────┐
                     │   Send to      │                              │   Auto-retry   │
                     │   Client       │                              │   with fallback│
                     └────────────────┘                              │   format       │
                                                                     └────────────────┘
```

### FFprobe Checks

1. **File exists** and is larger than 1KB
2. **Exit code 0** - FFprobe can read the file
3. **Has streams** - At least one video or audio stream detected
4. **Duration > 0** - File has playable content

### Fallback Format Order

When corruption is detected, automatic retry with safer formats:

| Attempt | Format | Description |
|---------|--------|-------------|
| 1 | Original | User's selected format |
| 2 | `best[height<=720]` | 720p max (stable) |
| 3 | `best[height<=480]` | 480p max (very stable) |
| 4+ | `best` | Any available format |

### Optimized yt-dlp Arguments

```bash
# Stability improvements in v5.1.0
--retries 15               # Increased from 10
--fragment-retries 15      # Increased from 10
--socket-timeout 10        # Faster failure detection
--http-chunk-size 10M      # Optimal chunk size
--embed-metadata           # Better compatibility
--postprocessor-args "ffmpeg:-c:v copy -c:a aac -movflags +faststart"
```

### Testing FFprobe Locally

```bash
# Check if ffprobe is available
ffprobe -version

# Validate a downloaded file
ffprobe -v error -show_format -show_streams video.mp4

# Should show format info and streams (video/audio)
# Exit code 0 = valid, non-zero = corrupt
```

### Environment Variables for Tuning

| Variable | Default | Description |
|----------|---------|-------------|
| `COOKIES_CACHE_TTL` | `30000` | Cookies cache duration (ms) |
| `DOWNLOAD_TIMEOUT` | `300000` | Max download time (5 min) |
| `CONNECT_TIMEOUT` | `30000` | Initial connection timeout (30s) |

## 🔄 Proxy Download Feature

Downloads are **proxied through the server**:

```
Client clicks "Download" → Server runs yt-dlp → Stream piped to client → File downloads directly
```

Benefits:
- ✅ **No client cookies needed** - Server uses auto-fetched cookies
- ✅ **No broken tabs** - Downloads start immediately as file downloads
- ✅ **Universal access** - Works for all visitors worldwide
- ✅ **Progress tracking** - Real-time download progress in the browser
- ✅ **Cancel support** - Can cancel downloads mid-stream

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + DaisyUI |
| Animations | Framer Motion |
| Database | SQLite + drizzle-orm |
| Auth | JWT (jose) + bcryptjs |
| Downloader | yt-dlp (via yt-dlp-wrap) |
| HTTP Client | Axios |
| Validation | Zod |
| Notifications | react-hot-toast |
| Icons | react-icons |
| Logging | winston |
| Testing | Jest + React Testing Library |

## 📋 Prerequisites

- Node.js 18.0 or higher
- npm or yarn
- Docker (optional, for containerized deployment)

## 🚀 Quick Start

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/youtube-downloader-yt-dlp-nextjs-auto-cookies.git
cd youtube-downloader-yt-dlp-nextjs-auto-cookies

# 2. Install dependencies
npm install

# 3. Set environment variables (optional)
export COOKIES_URL=https://your-cookies-url.com/cookies.txt

# 4. Run development server
npm run dev

# 5. Open in browser
open http://localhost:3000

# 6. Access admin panel
open http://localhost:3000/admin
# Default credentials: admin / admin123
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t youtube-downloader:latest .
docker run -p 3000:3000 -v yt-downloader-data:/data youtube-downloader:latest

# View logs
docker-compose logs -f
```

## 🔐 Admin Panel

### Accessing the Admin Panel

Navigate to `/admin` to access the admin panel.

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Important:** Change the default password after first login!

### Admin Features

#### Dashboard
- View real-time statistics
- Auto-cookies system health (Active/Disabled)
- Cookie fetch success/failure rates
- Fallback usage counter
- External cookies URL display
- Total fetches, success rate, failed requests

#### History (`/admin/history`)
- View all fetch/download activity
- Pagination support
- See success/failure status
- IP address and user agent logging
- Clear history option

#### Settings (`/admin/settings`)
- Site name customization
- Site description
- Upload custom logo
- Upload custom favicon
- All changes are persisted in SQLite database

#### Profile (`/admin/profile`)
- Change admin username
- Update password
- Secure bcrypt hashing

## 🐳 Docker Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | `your-secret-key...` | Secret for JWT tokens (change in production!) |
| `DATABASE_PATH` | `/data/app.db` | SQLite database path |
| `COOKIES_URL` | `https://amy-...` | External URL for auto-fetch cookies |
| `UPLOADS_DIR` | `/data/uploads` | Directory for uploaded files |

### Volumes

The application uses a persistent volume for data:

```yaml
volumes:
  - yt-downloader-data:/data
```

This volume contains:
- `app.db` - SQLite database
- `uploads/` - Logo and favicon uploads

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    image: mpratamamail/yt-downloader:latest
    container_name: app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-super-secret-key-here
      - COOKIES_URL=https://your-cookies-url.com/cookies.txt
    volumes:
      - yt-downloader-data:/data

volumes:
  yt-downloader-data:
```

## 📁 Project Structure

```
├── app/
│   ├── admin/              # Admin panel pages
│   │   ├── history/
│   │   ├── login/
│   │   ├── profile/
│   │   ├── settings/
│   │   ├── layout.tsx
│   │   └── page.tsx        # Dashboard with auto-cookies stats
│   ├── api/
│   │   ├── admin/          # Admin API routes
│   │   │   ├── auth/
│   │   │   ├── history/
│   │   │   ├── profile/
│   │   │   ├── settings/
│   │   │   ├── stats/
│   │   │   └── upload/
│   │   ├── download/       # Proxy download API (v5.0)
│   │   ├── fetch-info/     # Video info API (v5.0)
│   │   ├── download-progress/ # SSE progress
│   │   └── health/         # Health check
│   ├── layout.tsx
│   └── page.tsx            # Main downloader page
├── components/
│   ├── admin/              # Admin components
│   │   └── AdminSidebar.tsx # Updated for v5.0
│   ├── DownloadButton.tsx
│   ├── Footer.tsx
│   ├── FormatSelector.tsx
│   ├── Header.tsx
│   ├── LoadingSpinner.tsx
│   ├── PlaylistView.tsx
│   ├── UrlForm.tsx
│   └── VideoInfo.tsx
├── lib/
│   ├── db/
│   │   ├── index.ts        # Database operations
│   │   └── schema.ts       # Drizzle ORM schema (no cookies table)
│   ├── auto-cookies.ts     # 🆕 Auto-fetch cookies utility
│   ├── auth.ts             # JWT authentication
│   ├── config.ts           # Configuration
│   ├── progress-store.ts   # SSE progress tracking
│   ├── types.ts            # TypeScript types
│   ├── user-agents.ts      # Random user agent rotation
│   └── ytdlp.ts            # yt-dlp wrapper
├── middleware.ts           # Route protection
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 🔧 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fetch-info` | Fetch video metadata (uses auto-cookies) |
| POST | `/api/download` | Proxy download with auto-cookies |
| GET | `/api/download-progress` | SSE progress stream |
| GET | `/api/health` | Health check |

### Admin Endpoints (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/auth/login` | Admin login |
| POST | `/api/admin/auth/logout` | Admin logout |
| GET | `/api/admin/stats` | Dashboard statistics (includes auto-cookies stats) |
| GET/PUT | `/api/admin/settings` | Site settings |
| GET/PUT | `/api/admin/profile` | Admin profile |
| PUT | `/api/admin/profile/password` | Change password |
| GET/DELETE | `/api/admin/history` | History management |
| POST | `/api/admin/upload` | Upload logo/favicon |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## 🔒 Security Considerations

1. **Change Default Credentials** - Always change `admin/admin123` after deployment
2. **Set JWT_SECRET** - Use a strong, unique secret in production
3. **HTTPS** - Use a reverse proxy (nginx) with SSL in production
4. **Rate Limiting** - Built-in rate limiting prevents abuse
5. **Non-Root Docker** - Container runs as non-root user
6. **Cookie Sanitization** - Fetched cookies are sanitized before use

## 🚨 Troubleshooting

### Auto-Cookies Issues

**Problem:** High fallback usage
- Check if external cookies URL is accessible
- Verify cookies URL returns valid Netscape format
- Check network connectivity from server

**Problem:** Bot detection errors persist
- External cookies may be expired
- Try a different cookies source
- Check if YouTube has changed detection methods

**Problem:** Slow downloads
- Cookies fetch adds ~1-5s overhead per request
- Consider monitoring cookies URL response time

## 📜 License

MIT License - See [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a PR.

## ⚠️ Disclaimer

This tool is for **educational and personal use only**. Downloading copyrighted content without permission may violate YouTube's Terms of Service and applicable copyright laws. Users are solely responsible for ensuring their use complies with all applicable laws and regulations.

### Legal Use Cases
- Downloading your own uploaded content
- Educational research and analysis
- Content with appropriate licenses (Creative Commons, etc.)
- Videos you have explicit permission to download
