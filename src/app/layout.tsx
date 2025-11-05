import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import "./globals.css";
import SimpleLayout from "./simple-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Demo Parts Co. - Stock Management",
  description:
    "Stock Management System - Automotive Parts & Supplies Demo",
  icons: {
    icon: [
      {
        url: "/favicon.png",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <SimpleLayout>{children}</SimpleLayout>
      </body>
    </html>
  );
}
