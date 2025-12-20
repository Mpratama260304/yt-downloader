# 🎬 YouTube Downloader v5.3.0 - Streaming Fix Update

A modern, production-ready web application for downloading YouTube videos using yt-dlp. Features **pure streaming proxy** (no temp file wait), **keep-alive heartbeats**, **proxy rotation**, and **auto-cookies** optimized for serverless environments.

**🚀 Designed for Phala Cloud, Vercel, and VPS platforms with strict timeout limits**

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)
![DaisyUI](https://img.shields.io/badge/DaisyUI-4.12-5A0EF8?style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## ✨ What's New in v5.3.0

### 🚀 Streaming Fix Update (408 Timeout Final Fix)
This update addresses persistent **408 Request Timeout** errors that occurred even after v5.2.0 fixes.

#### Error Being Fixed
```
POST https://ytvidsave.online/api/download 408 (Request Timeout)
Download error: Error: Download timed out. Try a lower quality format.
```

#### Root Cause Analysis
The previous approach waited for the full file to download before streaming to the client. On Phala Cloud (~60-120s gateway timeout), this caused 408 errors for any video that took longer than the gateway timeout.

#### Solution: Pure Streaming
```
                    OLD (v5.2.0)                              NEW (v5.3.0)
                    
   yt-dlp ──► temp file ──► wait ──► stream         yt-dlp stdout ─┬─► response (chunked)
                  │                     │                           │
                  └── could take 2min+ ─┘                           └── immediate streaming
                         ▼                                                    ▼
                     408 TIMEOUT                                          SUCCESS
```

### Key Changes from v5.2.0

| Feature | v5.2.0 | v5.3.0 |
|---------|--------|--------|
| Output Method | Temp file → stream | `stdout` → direct stream |
| Keep-Alive | None | Heartbeat every 10s |
| Transfer | Wait for complete | Chunked, immediate |
| Proxy Support | None | Rotation via env/admin |
| Cookies Cache | 60s | 120s |
| Concurrent Fragments | 2 | 1 (stability) |
| Timeout | 120s | 300s (5min with streaming) |

### Implementation Details

```typescript
// v5.3.0 Streaming approach
const args = [url, '-f', format, '-o', '-']; // Output to stdout
const proc = spawn('yt-dlp', args);

// Pipe stdout directly to response (no temp file!)
const stream = new ReadableStream({
  start(controller) {
    proc.stdout.on('data', chunk => controller.enqueue(chunk));
    proc.on('close', () => controller.close());
  }
});

return new Response(stream, {
  headers: {
    'Transfer-Encoding': 'chunked',
    'Connection': 'keep-alive',
  }
});
```

## 🛡️ Proxy Support (NEW in v5.3.0)

### Configure Proxies

**Option 1: Environment Variable**
```yaml
# docker-compose.yml
environment:
  - PROXY_LIST=http://user:pass@proxy1:8080,http://proxy2:8080
  # or
  - PROXIES=socks5://proxy:1080
```

**Option 2: Admin Panel**
Navigate to Admin → Settings → Proxies and add your proxy list.

### Why Use Proxies?
- Bypass YouTube IP blocks
- Improve download speeds
- Distribute requests across IPs
- Avoid rate limiting

## ⚠️ Serverless Deployment Notes

### Phala Cloud / Vercel Recommendations

1. **Streaming works within limits** - No more 408 timeouts on normal videos
2. **Very long videos (>10 min)** - May still timeout; consider lower quality
3. **Proxy rotation** - Helps if YouTube blocks your server IP
4. **Keep-alive heartbeats** - Prevent gateway from closing idle connections

### Recommended docker-compose.yml

```yaml
version: '3.8'
services:
  youtube-downloader:
    image: mpratamamail/youtube-downloader:5.3.0
    container_name: youtube-downloader
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=your-secure-password
      - JWT_SECRET=your-jwt-secret-key
      - COOKIES_URL=https://your-cookies-server.com/cookies.txt
      # Optional: Add proxies
      - PROXY_LIST=http://proxy1:8080,http://proxy2:8080
    volumes:
      - youtube_data:/data
    restart: unless-stopped

volumes:
  youtube_data:
```

## ✨ Features

### Core Functionality
- 🎬 **Video Downloads** - Various resolutions (4K, 1080p, 720p, etc.)
- 🎵 **Audio Extraction** - MP3, M4A formats
- 📋 **Playlist Support** - Browse and download individual videos
- 🔄 **Streaming Proxy** - Pure stdout streaming, no temp file wait
- 📱 **YouTube Shorts** - Full support
- 📏 **File Size Display** - Estimated file size for each format
- ⬇️ **Progress Tracking** - Real-time SSE progress

### 🎛️ Admin Panel
- 🔐 **Secure Authentication** - JWT-based login
- 📊 **Dashboard** - Real-time statistics
- 📜 **History Logs** - Track all activity
- ⚙️ **Site Settings** - Customize appearance
- 🌐 **Proxy Management** - Add/remove proxies
- 👤 **Profile Management** - Change password

### 2025 Bot Detection Fixes
- 🍪 **Auto-Fetch Cookies** - Fresh cookies from external URL
- 🎭 **Random User-Agent** - Rotation to avoid detection
- 🔐 **Consent Cookies** - Automatic bypass fallback
- ⏱️ **Request Throttling** - Avoids rate limits
- 🌍 **Geo Bypass** - Works around regional restrictions
- 🔄 **Proxy Rotation** - Distribute requests across IPs

### Modern UI/UX
- �� **Beautiful Design** - DaisyUI components
- 🌙 **Dark/Light Mode** - System-aware toggle
- ✨ **Animations** - Framer Motion
- 📱 **Fully Responsive** - Mobile-first
- 🔔 **Toast Notifications** - Real-time feedback

## 🚀 Quick Start

### Docker (Recommended)

```bash
# Pull latest image
docker pull mpratamamail/youtube-downloader:5.3.0

# Run with docker-compose
docker-compose up -d
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_USERNAME` | `admin` | Admin panel username |
| `ADMIN_PASSWORD` | `admin123` | Admin panel password |
| `JWT_SECRET` | random | Secret for JWT tokens |
| `COOKIES_URL` | cloudflare tunnel | External cookies URL |
| `PROXY_LIST` | (none) | Comma-separated proxy URLs |

### Proxy URL Formats

```
http://proxy:8080
http://user:pass@proxy:8080
socks5://proxy:1080
socks5://user:pass@proxy:1080
```

## 📊 Streaming Flow (v5.3.0)

```
┌─────────────────┐     yt-dlp stdout     ┌─────────────────┐
│   yt-dlp        │ ────────────────────► │   Response      │
│   -o -          │    (immediate)        │   Stream        │
└─────────────────┘                       └────────┬────────┘
                                                   │
         ┌─────────────────────────────────────────┤
         │                                         │
         ▼                                         ▼
┌────────────────┐                       ┌────────────────┐
│  Keep-Alive    │                       │  Chunked       │
│  Heartbeat     │                       │  Transfer      │
│  every 10s     │                       │  to Client     │
└────────────────┘                       └────────────────┘
```

**Key points:**
- No temp file wait (chunks stream immediately)
- Keep-alive prevents gateway timeout
- Chunked transfer allows progressive download
- Client starts receiving data within seconds

## 🐛 Troubleshooting

### "408 Request Timeout"
- **v5.3.0 should fix this** - Streaming eliminates full-file wait
- If still occurs: Video may be too long, try lower quality
- Check if proxies are configured (may help with slow sources)

### "Download timed out"
- Very long videos (>10 min) may still timeout
- Solution: Select 480p or below for long videos
- Enable proxy rotation if available

### "YouTube blocked the request"
- Bot detection triggered
- Wait a few minutes; cookies will auto-refresh
- Add proxies to rotate IP addresses

### Server not responding
- Check COOKIES_URL accessibility
- Verify proxy configuration if using
- Check server logs for errors

## 📝 Changelog

### v5.3.0 (2025-01-XX) - Streaming Fix
- 🚀 **Pure streaming** - `stdout` to response (no temp file wait)
- 💓 **Keep-alive heartbeats** - 10s interval to prevent gateway timeout
- 🔄 **Proxy rotation** - Support via env/admin panel
- 🍪 **Extended cache** - 120s cookies cache for stability
- 📦 **Chunked transfer** - Immediate data flow to client
- ⬇️ **Single fragment** - Better stability for streaming

### v5.2.0 (2025-01-XX) - Timeout Fix
- Removed FFprobe validation
- Relaxed size validation (50-200% tolerance)
- Extended timeouts (120s)
- Reduced concurrent fragments (2)

### v5.1.0 (2025-01-XX)
- Added FFprobe validation (removed in v5.2.0)
- Added auto-fallback formats
- Added cookies caching

### v5.0.0 (2025-01-XX)
- Auto-fetch cookies from external URL
- Removed manual cookies management
- Real-time cookie sync

## 📄 License

MIT License - See [LICENSE](LICENSE) file

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

**⭐ Star this repo if it helps you!**
