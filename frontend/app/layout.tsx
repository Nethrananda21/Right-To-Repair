import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Repair.AI - AI-Powered Repair Assistant",
  description: "Upload images of broken items and get AI-powered repair solutions and spare parts recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Quicksand:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap" 
          rel="stylesheet" 
        />
        <link 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="h-screen w-screen overflow-hidden flex flex-col md:flex-row bg-[var(--soft-sage)] transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
