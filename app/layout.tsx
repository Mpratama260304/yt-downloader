import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'YouTube Downloader - Download Videos with yt-dlp',
    template: '%s | YouTube Downloader',
  },
  description: 'A modern, production-ready web app to download YouTube videos using yt-dlp. Features 2025 bot detection fixes, support for videos, playlists, and multiple formats.',
  keywords: ['youtube', 'downloader', 'yt-dlp', 'video', 'audio', 'mp3', 'mp4', 'playlist', 'download'],
  authors: [{ name: 'YouTube Downloader Team' }],
  creator: 'YouTube Downloader',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'YouTube Downloader - Download Videos with yt-dlp',
    description: 'Download YouTube videos and audio with a modern, responsive web app.',
    type: 'website',
    locale: 'en_US',
    siteName: 'YouTube Downloader',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube Downloader',
    description: 'Download YouTube videos and audio with yt-dlp.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1d232a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <div className="flex flex-col min-h-screen bg-base-100">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              className: 'bg-base-100 text-base-content shadow-lg',
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
