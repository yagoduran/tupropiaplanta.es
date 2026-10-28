import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tu Propia Planta",
  description: "Cuida tu planta las 24 horas, aunque no estés.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
