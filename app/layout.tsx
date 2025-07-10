import type { Metadata } from "next";
import "./globals.css";
import ChatSidebar from '@/components/ChatSidebar';
import { FileProvider } from '@/context/FileContext';

export const metadata: Metadata = {
  title: "Aira",
  description: "A modern office suite with document and spreadsheet editing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <FileProvider>
          {children}
          <ChatSidebar />
        </FileProvider>
      </body>
    </html>
  );
}
