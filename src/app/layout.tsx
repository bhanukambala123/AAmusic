import type { Metadata } from "next";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import { AuthProvider } from "@/context/AuthContext";
import { AudioProvider } from "@/context/AudioContext";

export const metadata: Metadata = {
  title: "AAmusic - Allu Arjun Music Streaming",
  description: "A premium cross-platform music streaming application focused exclusively on songs of Allu Arjun movies and albums.",
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
            <MainLayout>{children}</MainLayout>
          </AudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
