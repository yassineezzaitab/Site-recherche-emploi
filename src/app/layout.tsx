import type { Metadata, Viewport } from "next";
import { Inter, Lexend } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import { getSession } from "@/lib/auth/session";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const lexend = Lexend({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "JobMatch — Recherche d'emploi intelligente",
  description:
    "Importez votre CV, laissez l'IA construire votre profil, et trouvez les offres qui vous correspondent vraiment.",
  applicationName: "JobMatch",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JobMatch",
  },
};

export const viewport: Viewport = {
  themeColor: "#3866e3",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="fr" className={`${inter.variable} ${lexend.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers session={session}>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
