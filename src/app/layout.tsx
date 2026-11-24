import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { NotificationHost } from '@/components/ui/notification-host';
import { HmisBatchResultsHost } from '@/components/hmis/hmis-batch-results-modal';
import { DesktopClientHost } from '@/components/desktop/DesktopClientHost';
import { ClinicBackgroundHost } from '@/components/clinic-node/clinic-background-host';
import { config } from '@/lib/config';

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = (headerList.get('host') || '').toLowerCase();
  const isAtlas = host.includes('atlas') || config.isAtlasMode;

  if (isAtlas) {
    return {
      title: {
        default: 'DocEducates Atlas — Interactive Human Anatomy Academy',
        template: '%s | DocEducates Atlas',
      },
      description: 'Master clinical cross-sectional anatomy with 14,089 real diagnostic slices, bilingual Terminologia Anatomica, and interactive self-quizzing.',
      icons: {
        icon: '/brand/atlas-icon.svg',
      },
      openGraph: {
        title: 'DocEducates Atlas — Interactive Human Anatomy Academy',
        description: 'Master clinical cross-sectional anatomy with 14,089 real diagnostic slices, bilingual Terminologia Anatomica, and interactive self-quizzing.',
        siteName: 'DocEducates Atlas',
      },
    };
  }

  return {
    title: {
      default: 'Rad Suite — Advanced Radiology Reporting Workstation',
      template: '%s | Rad Suite',
    },
    description: 'Hospital-grade radiology reporting, PACS imaging, voice dictation, and HMIS bridge.',
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      ],
      shortcut: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
    manifest: '/site.webmanifest',
    openGraph: {
      title: 'Rad Suite — Advanced Radiology Reporting Workstation',
      description: 'Hospital-grade radiology reporting, PACS imaging, voice dictation, and HMIS bridge.',
      siteName: 'Rad Suite',
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Literata:ital,opsz,wght@0,7..72,400..700;1,7..72,400..700&family=Nunito+Sans:ital,opsz,wght@0,6..12,300..800;1,6..12,300..800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="antialiased font-body min-h-screen bg-background text-on-surface select-none">
        <ThemeProvider>
          {children}
          <NotificationHost />
          <HmisBatchResultsHost />
          <DesktopClientHost />
          <ClinicBackgroundHost />
        </ThemeProvider>
      </body>
    </html>
  );
}
