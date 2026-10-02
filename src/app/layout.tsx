import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movete, Leproso Movete!",
  description: "Datos, análisis y pasión leprosa.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/Leproso.png", apple: "/brand/Leproso.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
