import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Foliq | Personal Finance Tracker",
    template: "%s | Foliq",
  },
  description:
    "Personal finance tracker PWA for multi-wallet balances, daily cashflow, transfers, and monthly category budgets.",
  applicationName: "Foliq",
  manifest: "/manifest.webmanifest",
  robots: {
    index: false,
    follow: false,
  },
  appleWebApp: {
    capable: true,
    title: "Foliq",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    title: "Foliq | Personal Finance Tracker",
    description:
      "Fast multi-wallet cashflow, transfer, and monthly budget tracker built as an installable iOS and desktop PWA.",
    siteName: "Foliq",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('foliq-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || (!stored && prefersDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
    var meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', isDark ? '#000000' : '#F5F6F8');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={plusJakartaSans.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <div aria-hidden="true" className="pwa-status-bar-shield no-print" />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
