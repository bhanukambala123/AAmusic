import type { Metadata, Viewport } from "next";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import { AuthProvider } from "@/context/AuthContext";
import { AudioProvider } from "@/context/AudioContext";
import { PwaProvider } from "@/context/PwaContext";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "AAmusic - Allu Arjun Music Streaming",
  description: "A premium cross-platform music streaming application focused exclusively on songs of Allu Arjun movies and albums.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AAmusic",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AudioProvider>
            <PwaProvider>
              <MainLayout>{children}</MainLayout>
            </PwaProvider>
          </AudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
