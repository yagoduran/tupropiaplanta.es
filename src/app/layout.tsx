import type { Metadata } from "next";
import { Archivo, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const pixel = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const texto = Archivo({
  variable: "--font-texto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: "Tu Propia Planta",
  description: "Cuida tu planta las 24 horas, aunque no estés.",
  openGraph: { images: ["/og.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${pixel.variable} ${texto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
