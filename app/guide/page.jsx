"use client";
import "../../lib/i18n"; // Import the i18n instance from the lib folder
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";
import { Montserrat } from "next/font/google";
import { GiCheerful, GiStarFormation, GiPresent } from "react-icons/gi";
import { FaUserAlt, FaChevronRight } from "react-icons/fa";

const montserrat = Montserrat({
  weight: "700",
  subsets: ["latin"],
});

// For framer-motion animated cards
const MotionCard = motion(Card);

export default function GuidePage() {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Handle language change
  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  // Game sections data with more enticing descriptions
  const gameSections = [
    {
      title: t("games.ghostJump.title", "Ghost Jump"),
      description: t(
        "games.ghostJump.description",
        "Experience the thrill of defying gravity in Ghost Jump! ..."
      ),
      image: "/ghostjumpcard.webp"
    },
    {
      title: t("games.kaspianCross.title", "Kaspian Cross"),
      description: t(
        "games.kaspianCross.description",
        "Challenge fate in Kaspian Cross! ..."
      ),
      image: "/kaspiancrosscard.webp"
    },
    {
      title: t("games.crash.title", "Crash"),
      description: t(
        "games.crash.description",
        "Feel the adrenaline surge in Crash! ..."
      ),
      image: "/crashcard.webp"
    },
    {
      title: t("games.mines.title", "Mines"),
      description: t(
        "games.mines.description",
        "Uncover hidden treasures in Mines! ..."
      ),
      image: "/minescard.webp"
    },
    {
      title: t("games.upgrade.title", "Upgrade"),
      description: t(
        "games.upgrade.description",
        "Ready for a power-up? ..."
      ),
      image: "/upgradecard.webp"
    },
    {
      title: t("games.kaspaTowerClimb.title", "Kaspa Tower Climb"),
      description: t(
        "games.kaspaTowerClimb.description",
        "Ascend the heights in Kaspa Tower Climb! ..."
      ),
      image: "/kaspatowerclimbcard.webp"
    },
    {
      title: t("games.guessTheCup.title", "Guess The Cup"),
      description: t(
        "games.guessTheCup.description",
        "Test your luck in Guess The Cup! ..."
      ),
      image: "/guessthecupcard.webp"
    },
    {
      title: t("games.plinko.title", "Plinko"),
      description: t(
        "games.plinko.description",
        "Embrace the unpredictability of Plinko! ..."
      ),
      image: "/plinkocard.webp"
    },
    {
      title: t("games.roulette.title", "Roulette"),
      description: t(
        "games.roulette.description",
        "Bet on your lucky charm in Roulette! ..."
      ),
      image: "/roulettecard.webp"
    },
    {
      title: t("games.dice.title", "Dice"),
      description: t(
        "games.dice.description",
        "Roll the dice of destiny in Dice! ..."
      ),
      image: "/dicecard.webp"
    },
    {
      title: t("games.coinFlip.title", "Coin Flip"),
      description: t(
        "games.coinFlip.description",
        "Flip the coin of fortune! ..."
      ),
      image: "/coinflipcard.webp"
    },
    {
      title: t("games.kasperLootBox.title", "Kasper Loot Box"),
      description: t(
        "games.kasperLootBox.description",
        "Unbox surprises in Kasper Loot Box! ..."
      ),
      image: "/kasperlootboxcard.webp"
    },
    {
      title: t("games.kasenMania.title", "Kasen Mania"),
      description: t(
        "games.kasenMania.description",
        "Dive into Kasen Mania, our electrifying slots adventure! ..."
      ),
      image: "/kasenmaniacard.webp"
    }
  ];

  // Section headings for sidebar
  const sectionHeadings = [
    { id: "games", title: t("gamesSection.title", "Games"), icon: <GiCheerful /> },
    { id: "xp", title: t("xpSection.title", "XP & Leveling"), icon: <GiStarFormation /> },
    { id: "gems", title: t("gemSection.title", "Gem System"), icon: <GiPresent /> },
    { id: "referrals", title: t("referralSection.title", "Referrals"), icon: <FaUserAlt /> }
  ];

  return (
    <div className={`${montserrat.className} min-h-screen bg-black`}>
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
        .hover-effect:hover {
          filter: drop-shadow(0 0 8px #49eacb);
        }
        .nav-hover {
          transition: filter 0.3s ease;
        }
        .nav-hover:hover {
          filter: drop-shadow(0 0 8px #49eacb);
        }
        .icon-primary {
          color: #49eacb;
          fill: #49eacb;
        }
        .guide-card {
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .guide-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(73,234,203,0.2);
        }
        .feature-icon {
          transition: all 0.3s ease;
        }
        .feature-icon:hover {
          transform: scale(1.2);
        }
        @media (min-width: 768px) {
          .game-card {
            max-width: 30vw;
          }
        }
        @media (max-width: 767px) {
          .game-card {
            max-width: 80vw;
          }
        }
        .sidebar {
          transition: transform 0.3s ease;
        }
        .sidebar-closed {
          transform: translateX(-100%);
        }
        .sidebar-open {
          transform: translateX(0);
        }
        .game-row {
          margin-bottom: 30px;
        }
        .section-heading {
          margin-top: 40px;
          margin-bottom: 30px;
        }
      `}</style>

      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-[#49EACB]/10 backdrop-blur-sm sticky top-0 z-50">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-0"
          >
            <motion.div
              className="h-14 w-56 relative -ml-3 rounded-lg overflow-hidden nav-hover"
              style={{ transition: "box-shadow 0.3s ease-in-out" }}
            >
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/KasinoLogo-dNjo5dabxCyYjru57bn36oP8Ww9KCS.png"
                alt="Kasino Logo"
                fill
                className="object-contain"
              />
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4"
          >
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
        </header>

        {/* Sidebar Toggle */}
        {/* Now using an inner wrapper with margin-top to push it down */}
        <motion.div 
          className="fixed left-0 top-0 z-40 cursor-pointer"
          whileHover={{ x: 5 }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <div className="mt-24">
            <Card className="p-3 bg-gray-900 border border-[#49EACB]/20 rounded-r-lg">
              <FaChevronRight
                className={`text-[#49EACB] transform transition-transform duration-300 ${
                  sidebarOpen ? "rotate-180" : ""
                }`}
              />
            </Card>
          </div>
        </motion.div>

        {/* Sidebar Navigation */}
        {/* The sidebar is fixed at top-0 and its inner content is padded to start under the nav */}
        <motion.div
          className={`fixed left-0 mt-20 h-full w-64 bg-gray-900/95 backdrop-blur-lg z-30 px-4 sidebar ${
            sidebarOpen ? "sidebar-open" : "sidebar-closed"
          }`}
          initial={{ x: -300 }}
          animate={{ x: sidebarOpen ? 0 : -300 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="pt-20">
            <div className="flex flex-col space-y-4">
              {sectionHeadings.map((section) => (
                <motion.a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                  whileHover={{ x: 5 }}
                >
                  <span className="text-[#49EACB] text-xl">{section.icon}</span>
                  <span className="font-medium">{section.title}</span>
                </motion.a>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-hidden">
          {/* Hero Section with Language Selector */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <div className="flex flex-col items-center justify-center gap-4 mb-12">
              <h1 className="text-4xl md:text-6xl font-bold animate-gradient text-center">
                {t("guideTitle", "Kasino Guide")}
              </h1>
              
              <p className="text-xl text-gray-300 max-w-3xl mx-auto text-center">
                {t("guideSubtitle", "Everything you need to know about playing, earning, and winning at Kasino!")}
              </p>

              {/* Centered Language Selector */}
              <div className="mt-4 mb-12">
                <select
                  value={i18n.language}
                  onChange={handleLanguageChange}
                  className="bg-gray-800 text-white border border-[#49EACB] rounded-md p-2"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
            </div>
          </motion.section>

          {/* Games Section */}
          <motion.section
            id="games"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-24"
          >
            <h2 className="text-3xl md:text-4xl font-bold section-heading flex items-center justify-center gap-4">
              <span className="icon-primary">
                <GiCheerful className="text-4xl" />
              </span>
              <span className="animate-gradient">{t("gamesSection.title", "Games")}</span>
            </h2>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-16">
              {gameSections.map((game, index) => (
                <MotionCard
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="guide-card bg-gray-900 border border-[#49EACB]/20 rounded-xl overflow-hidden game-card mx-auto mb-8"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="relative h-64 w-full">
                    <Image
                      src={game.image}
                      alt={game.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3 text-[#49EACB]">{game.title}</h3>
                    <p className="text-gray-300">{game.description}</p>
                  </div>
                </MotionCard>
              ))}
            </div>
          </motion.section>

          {/* XP & Leveling System */}
          <motion.section
            id="xp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mb-24"
          >
            <h2 className="text-3xl md:text-4xl font-bold section-heading flex items-center justify-center gap-4">
              <span className="icon-primary">
                <GiStarFormation className="text-4xl" />
              </span>
              <span className="animate-gradient">{t("xpSection.title", "XP & Leveling System")}</span>
            </h2>
            
            <div className="max-w-4xl mx-auto bg-gray-900/50 border border-[#49EACB]/20 rounded-xl p-8">
              <div className="flex flex-col items-center gap-8 mb-8">
                <motion.div 
                  className="w-full"
                  initial={{ x: -20 }}
                  animate={{ x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h3 className="text-2xl font-bold mb-4 text-[#49EACB]">
                    {t("xpSection.earnXP.title", "Earn XP with Every Bet")}
                  </h3>
                  <p className="text-gray-300 mb-4">
                    {t("xpSection.earnXP.description", "Every KAS you bet earns you 1 XP...")}
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-[#49EACB] mr-2">•</span>
                      <span>{t("xpSection.earnXP.rule1", "1 KAS bet = 1 XP earned")}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#49EACB] mr-2">•</span>
                      <span>{t("xpSection.earnXP.rule2", "Higher levels unlock better rewards")}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#49EACB] mr-2">•</span>
                      <span>{t("xpSection.earnXP.rule3", "Check your level in the navigation bar")}</span>
                    </li>
                  </ul>
                </motion.div>
              </div>
              
              <div className="mt-8">
                <h3 className="text-2xl font-bold mb-6 text-center text-[#49EACB]">
                  {t("xpSection.dailyLoot.title", "Daily Loot Boxes")}
                </h3>
                <p className="text-gray-300 text-center mb-8 max-w-2xl mx-auto">
                  {t("xpSection.dailyLoot.description", "As you level up, you unlock daily free loot boxes...")}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {[1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((level) => (
                    <motion.div
                      key={level}
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{ scale: 1.05 }}
                      className="bg-gray-800 rounded-lg p-4 text-center border border-[#49EACB]/20 w-[95vw] mx-auto sm:w-full mb-6"
                    >
                      <div className="text-[#49EACB] font-bold mb-2">
                        {t("xpSection.dailyLoot.level", "Level")} {level}
                      </div>
                      <div className="relative h-64 w-64 mx-auto">
                        <Image
                          src={`/Level${level}Card.webp`}
                          alt={`${t("xpSection.dailyLoot.alt", "Level")} ${level} ${t("xpSection.dailyLoot.box", "Loot Box")}`}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-gray-300">
                    {t("xpSection.dailyLoot.hint", "Click on the level icon in the navigation bar to open the Daily Loot Box menu.")}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Gem System */}
          <motion.section
            id="gems"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mb-24"
          >
            <h2 className="text-3xl md:text-4xl font-bold section-heading flex items-center justify-center gap-4">
              <span className="icon-primary">
                <GiPresent className="text-4xl" />
              </span>
              <span className="animate-gradient">{t("gemSection.title", "Gem System")}</span>
            </h2>
            
            <div className="max-w-4xl mx-auto bg-gray-900/50 border border-[#49EACB]/20 rounded-xl p-8">
              <div className="flex flex-col items-center gap-8">
                <motion.div 
                  className="w-full"
                  initial={{ x: -20 }}
                  animate={{ x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h3 className="text-2xl font-bold mb-6 text-[#49EACB]">
                    {t("gemSection.earnGems.title", "Earn Gems as You Play")}
                  </h3>
                  <p className="text-gray-300 mb-6">
                    {t("gemSection.earnGems.description", "Every bet gives you a chance to earn Gems...")}
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-[#49EACB] mr-2">•</span>
                      <span>{t("gemSection.earnGems.rule1", "Random chance to earn gems with each bet")}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#49EACB] mr-2">•</span>
                      <span>{t("gemSection.earnGems.rule2", "More bets = more chances to earn gems")}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#49EACB] mr-2">•</span>
                      <span>{t("gemSection.earnGems.rule3", "Higher gem tiers offer better rewards")}</span>
                    </li>
                  </ul>
                </motion.div>
              </div>
              
              <div className="mt-10">
                <h3 className="text-2xl font-bold mb-8 text-center text-[#49EACB]">
                  {t("gemSection.crates.title", "Gem Crates")}
                </h3>
                <p className="text-gray-300 text-center mb-10 max-w-2xl mx-auto">
                  {t("gemSection.crates.description", "There are 4 tiers of Gem Crates...")}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { tier: 1, gems: 10, image: "/gemtier1.webp" },
                    { tier: 2, gems: 100, image: "/gemtier2.webp" },
                    { tier: 3, gems: 1000, image: "/gemtier3.webp" },
                    { tier: 4, gems: 10000, image: "/gemtier4.webp" }
                  ].map((crate) => (
                    <MotionCard
                      key={crate.tier}
                      whileHover={{ scale: 1.05 }}
                      className="bg-gray-800 rounded-lg p-6 text-center border border-[#49EACB]/20 mb-6"
                    >
                      <div className="text-2xl font-bold text-[#49EACB] mb-4">
                        {t("gemSection.crates.tier", "Tier")} {crate.tier}
                      </div>
                      <div className="relative h-32 w-full mb-4">
                        <Image
                          src={crate.image}
                          alt={`${t("gemSection.crates.alt", "Gem Crate Tier")} ${crate.tier}`}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <div className="text-lg font-semibold text-[#49EACB]">
                        {crate.gems} {t("gemSection.crates.required", "Gems Required")}
                      </div>
                    </MotionCard>
                  ))}
                </div>
                
                <div className="mt-8 text-center">
                  <p className="text-gray-300">
                    {t("gemSection.crates.hint", "Click on the Gem Display in the navigation bar to open the Gem Crate menu.")}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Referral System */}
          <motion.section
            id="referrals"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mb-24 mt-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold section-heading flex items-center justify-center gap-4">
              <span className="icon-primary">
                <FaUserAlt className="text-3xl" />
              </span>
              <span className="animate-gradient">{t("referralSection.title", "Referral System")}</span>
            </h2>
            
            <div className="max-w-4xl mx-auto bg-gray-900/50 border border-[#49EACB]/20 rounded-xl p-8">
              <div className="flex flex-col items-center gap-8">
                <motion.div 
                  className="w-full"
                  initial={{ x: -20 }}
                  animate={{ x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <h3 className="text-2xl font-bold mb-6 text-[#49EACB]">
                    {t("referralSection.earn.title", "Earn with Friends")}
                  </h3>
                  <p className="text-gray-300 mb-6">
                    {t("referralSection.earn.description", "Our referral system rewards you for bringing friends to Kasino...")}
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-[#49EACB] mr-2">•</span>
                      <span>{t("referralSection.earn.rule1", "New players get 100 XP ...")}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#49EACB] mr-2">•</span>
                      <span>{t("referralSection.earn.rule2", "You earn 2% of every bet...")}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#49EACB] mr-2">•</span>
                      <span>{t("referralSection.earn.rule3", "Payouts are instant ...")}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#49EACB] mr-2">•</span>
                      <span>{t("referralSection.earn.rule4", "Custom referral links...")}</span>
                    </li>
                  </ul>
                </motion.div>
              </div>
              
              <div className="mt-10 text-center">
                <p className="text-gray-300">
                  {t("referralSection.hint", "To access your referral page, click on your name ...")}
                </p>
              </div>
            </div>
          </motion.section>

          {/* Final CTA */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="text-center mt-24 mb-24"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-[#49EACB]">
              {t("finalCTA.title", "Ready to Play?")}
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
              {t("finalCTA.description", "Join fellow Kaspian's enjoying Kasino's exciting games...")}
            </p>
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#49EACB] text-black px-8 py-4 rounded-lg font-bold text-lg mb-8"
              >
                {t("finalCTA.button", "Enter Kasino Now")}
              </motion.button>
            </Link>
          </motion.section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
