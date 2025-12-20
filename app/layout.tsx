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
    default: 'YT Vid Save - Free YouTube Video & Audio Downloader Online',
    template: '%s | YT Vid Save',
  },
  description: 'Download YouTube videos and audio for free with YT Vid Save. Fast, secure online tool supporting MP4, MP3, HD quality. No registration required. Works on all devices.',
  keywords: ['youtube downloader', 'download youtube video', 'youtube to mp3', 'youtube to mp4', 'free youtube downloader', 'online video downloader', 'yt downloader', 'youtube audio download', 'HD video download'],
  authors: [{ name: 'YT Vid Save' }],
  creator: 'YT Vid Save',
  publisher: 'YT Vid Save',
  manifest: '/manifest.json',
  metadataBase: new URL('https://ytvidsave.online'),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'YT Vid Save - Free YouTube Video & Audio Downloader',
    description: 'Download YouTube videos and audio for free. Fast, secure, and easy to use. Supports MP4, MP3, and HD quality downloads.',
    url: 'https://ytvidsave.online',
    type: 'website',
    locale: 'en_US',
    siteName: 'YT Vid Save',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'YT Vid Save - YouTube Video Downloader',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YT Vid Save - Free YouTube Video Downloader',
    description: 'Download YouTube videos and audio for free. Fast, secure online tool.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
