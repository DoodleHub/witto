import type { Metadata, Viewport } from "next";
import { Figtree, Source_Serif_4 } from "next/font/google";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import { SiteHeader } from "@/components/shell/site-header";
import { getSessionUser } from "@/lib/auth";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Witto — One fresh puzzle, every day",
  description: "A little challenge. A sharper you. One daily puzzle: word, math, riddle, trivia, mini crossword, spelling bee or connections.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0d16" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink">
        <SiteHeader user={user} />
        <main className="flex-1 pb-24 sm:pb-16">{children}</main>
        <MobileTabBar />
      </body>
    </html>
  );
}
