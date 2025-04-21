// app/terms/page.tsx
"use client";

import "../../lib/i18n";                     // core i18n setup
import { termsResources } from "../../lib/terms-i18n";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ weight: "700", subsets: ["latin"] });

// register the "terms" namespace for each language
Object.entries(termsResources).forEach(([lng, bundle]) => {
  i18n.addResourceBundle(lng, "terms", bundle.terms, true, true);
});

export default function TermsPage() {
  const { t } = useTranslation("terms");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sections = [
    "introduction",
    "licensing",
    "definitions",
    "eligibility",
    "registration",
    "responsible",
    "aml",
    "fairplay",
    "bonuses",
    "transactions",
    "dormant",
    "ip",
    "liability",
    "dispute",
    "termination",
    "amendments",
    "governing",
    "contact",
    "version",
    "reminder"
  ];

  return (
    <div className={`${montserrat.className} min-h-screen bg-black text-white`}>
      <style jsx global>{`
        @keyframes gradientAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background: linear-gradient(270deg, #49eacb, #006d5b, #003f2f, #006d5b, #49eacb);
          background-size: 400% 400%;
          animation: gradientAnimation 8s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .nav-hover {
          transition: filter 0.3s ease;
        }
        .nav-hover:hover {
          filter: drop-shadow(0 0 8px #49eacb);
        }
      `}</style>

      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-[#49EACB]/10 bg-black/75 backdrop-blur-sm sticky top-0 z-50">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <div className="h-14 w-56 relative -ml-3 rounded-lg overflow-hidden nav-hover">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/KasinoLogo-dNjo5dabxCyYjru57bn36oP8Ww9KCS.png"
              alt="Kasino Logo"
              fill
              className="object-contain"
            />
          </div>
        </motion.div>

        <div className="flex items-center gap-4">
          {/* Language Dropdown */}
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="bg-gray-800 text-white border border-[#49EACB] rounded-md p-2"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
          </select>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Link href="/">
              <motion.button
                className="bg-[#49EACB] text-black px-4 py-2 rounded-md font-bold"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t("backToCasino", "Back to Casino")}
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-[#49EACB] text-center animate-gradient">
          {t("title")}
        </h1>

        {sections.map((key) => {
          // pull out heading and rest-of-content
          const block = t(key, { returnObjects: true }) as Record<string, any>;
          const heading: string = block.heading;
          // gather everything except the heading property
          const bodies = Object.entries(block)
            .filter(([k]) => k !== "heading")
            .map(([_, v]) => v)
            .flat();

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <Card className="bg-gray-900/50 border border-[#49EACB]/30 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-[#49EACB] mb-4">
                  {heading}
                </h2>

                {key === "definitions" && Array.isArray(block.items) ? (
                  <ul className="list-disc pl-6 space-y-2 text-gray-300">
                    {block.items.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-4 text-gray-300">
                    {bodies.map((text: string, i: number) => (
                      <p key={i}>{text}</p>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </main>

      <SiteFooter />
    </div>
  );
}
