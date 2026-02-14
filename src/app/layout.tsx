import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SLEVIS | Smart Law Enforcement Vehicle Identification System",
  description: "Next-generation traffic monitoring and vehicle identification command center with AI-powered analysis and holographic 3D interface.",
  keywords: ["traffic", "law enforcement", "vehicle identification", "AI", "analytics"],
  authors: [{ name: "SLEVIS Command Center" }],
};

export const viewport: Viewport = {
  themeColor: "#00F0FF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#020205] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
