import type { Metadata } from "next";
import { Inter, Lexend } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const lexend = Lexend({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "JobMatch — Recherche d'emploi intelligente",
  description:
    "Importez votre CV, laissez l'IA construire votre profil, et trouvez les offres qui vous correspondent vraiment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${lexend.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
