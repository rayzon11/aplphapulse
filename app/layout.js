import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"]
});

export const metadata = {
  title: "AlphaPulse Pro",
  description:
    "AI-powered crypto alpha intelligence platform for early token discovery, trend detection, safety scoring, and Telegram alerts."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} bg-background text-text antialiased`}>
        {children}
      </body>
    </html>
  );
}
