import type React from "react";
import { Inter } from "next/font/google";
import { WalletProvider } from "@/contexts/WalletContext";
import { ModalProvider } from "@/contexts/ModalContext";
import "./globals.css";

export const metadata = {
  generator: "v0.dev",
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @keyframes glow {
            0% { box-shadow: 0 0 5px rgba(73, 234, 203, 0.2); }
            50% { box-shadow: 0 0 20px rgba(73, 234, 203, 0.4); }
            100% { box-shadow: 0 0 5px rgba(73, 234, 203, 0.2); }
          }

          .hover-glow:hover {
            animation: glow 2s infinite;
          }
        `}</style>
      </head>
      <body className={inter.className}>
        <WalletProvider>
          <ModalProvider>{children}</ModalProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
