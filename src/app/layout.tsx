// Claudesy's vision, brought to life.
import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import AppNav from "@/components/AppNav";
import AppFooter from "@/components/AppFooter";
import ThemeProvider from "@/components/ThemeProvider";
import CrewAccessGate from "@/components/CrewAccessGate";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sentra — Puskesmas Dashboard",
  description: "Clinical Information System — Sentra Healthcare Solutions",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-theme="dark" className={poppins.variable}>
      <body className={poppins.className}>
        <ThemeProvider>
          <CrewAccessGate>
            <div className="app-shell">
              <AppNav />
              <main className="app-content">
                <div className="app-page-stack">
                  {children}
                  <AppFooter />
                </div>
              </main>
            </div>
          </CrewAccessGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
