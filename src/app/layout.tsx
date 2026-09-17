import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movete, Leproso Movete!",
  description: "Datos, análisis y pasión leprosa.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
