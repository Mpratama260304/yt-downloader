/**
 * Script to download yt-dlp binary on first install
 * This runs automatically after npm install
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const YTDLP_DIR = path.join(process.cwd(), 'bin');
const YTDLP_PATH = path.join(YTDLP_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
}

async function main() {
  console.log('🔧 Setting up yt-dlp binary...');

  // Create bin directory if it doesn't exist
  if (!fs.existsSync(YTDLP_DIR)) {
    fs.mkdirSync(YTDLP_DIR, { recursive: true });
  }

  // Check if yt-dlp already exists
  if (fs.existsSync(YTDLP_PATH)) {
    console.log('✅ yt-dlp binary already exists');
    return;
  }

  // Determine the correct binary URL based on platform
  let binaryUrl;
  const platform = process.platform;
  
  if (platform === 'win32') {
    binaryUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  } else if (platform === 'darwin') {
    binaryUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
  } else {
    binaryUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  }

  console.log(`📥 Downloading yt-dlp from ${binaryUrl}...`);

  try {
    // Use curl or wget if available for better redirect handling
    try {
      execSync(`curl -L -o "${YTDLP_PATH}" "${binaryUrl}"`, { stdio: 'inherit' });
    } catch {
      try {
        execSync(`wget -O "${YTDLP_PATH}" "${binaryUrl}"`, { stdio: 'inherit' });
      } catch {
        await downloadFile(binaryUrl, YTDLP_PATH);
      }
    }

    // Make executable on Unix systems
    if (platform !== 'win32') {
      fs.chmodSync(YTDLP_PATH, '755');
    }

    console.log('✅ yt-dlp binary downloaded successfully!');
  } catch (error) {
    console.error('❌ Failed to download yt-dlp:', error.message);
    console.log('💡 You can manually download yt-dlp from https://github.com/yt-dlp/yt-dlp/releases');
    process.exit(1);
  }
}

main().catch(console.error);
