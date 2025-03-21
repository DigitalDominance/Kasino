"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { io, Socket } from "socket.io-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWallet } from "@/contexts/WalletContext";
import axios from "axios";

interface ChatMessage {
  username: string;
  walletAddress?: string;
  message: string;
  timestamp: string;
}

interface LiveChatProps {
  textColor?: string;
}

export function LiveChat({ textColor = "#B6B6B6" }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const { isConnected, username } = useWallet();

  // Banned words list and helper functions
  const bannedWords = [
    "anal", "anus", "arse", "ass", "asshole", "ballsack", "balls", "bastard", "bitch", "biatch", "bloody",
    "blowjob", "blow job", "bollock", "bollok", "boner", "boob", "bugger", "bum", "butt", "buttplug",
    "clitoris", "cock", "coon", "crap", "cunt", "damn", "dick", "dildo", "dyke", "fag", "feck",
    "fellate", "fellatio", "felching", "fuck", "f u c k", "fudgepacker", "fudge packer", "flange",
    "goddamn", "god damn", "hell", "homo", "jerk", "jizz", "knobend", "knob end", "labia", "lmao",
    "lmfao", "muff", "nigger", "nigga", "omg", "penis", "piss", "poop", "prick", "pube", "pussy",
    "queer", "scrotum", "sex", "shit", "s hit", "sh1t", "slut", "smegma", "spunk", "tit", "tosser",
    "turd", "twat", "vagina", "wank", "whore", "wtf",
    "f*ck", "sh*t", "d!ck", "b!tch", "a$$", "c*nt", "n!gger", "n!gga", "screw", "fuk",
    "asswipe", "bampot", "bawbag", "bellend", "berserk", "bint", "bollocks", "chancer",
    "choad", "crikey", "cuck", "dago", "dagoes", "dickhead", "dipshit", "donkeyribber",
    "dumbass", "fanny", "flamer", "fuckwit", "gash", "git", "gobshite", "goddammit", "gook",
    "honeybunch", "junglebungle", "kike", "minger", "muffdiver", "numpty", "paki",
    "plonker", "prat", "puto", "randy", "scrote", "shite", "slag", "spastic", "sod", "tosspot",
    "twatwaffle", "wazzock", "niggaballs",
    "cum", "porn", "no links allowed"
  ];

  function escapeChar(ch: string): string {
    return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function createBannedRegex(word: string): RegExp {
    const trimmed = word.replace(/\s+/g, "");
    const escapedChars = trimmed.split("").map(escapeChar);
    const pattern = escapedChars.join("\\s*");
    return new RegExp(`\\b${pattern}\\b`, "i");
  }

  const bannedRegexes = bannedWords.map(createBannedRegex);

  function filterMessage(message: string): string {
    for (const regex of bannedRegexes) {
      if (regex.test(message)) {
        return "*****";
      }
    }
    return message;
  }

  useEffect(() => {
    socketRef.current = io("https://kasino-backend-4818b4b69870.herokuapp.com");
    socketRef.current.on("chat message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;
    if (!isConnected || !username) return;

    let walletAddress = "";
    try {
      const accounts = await window.kasware.getAccounts();
      walletAddress = accounts[0] || "";
    } catch (err) {
      console.error("Error fetching wallet address:", err);
    }

    const sanitizedMessage = filterMessage(newMessage);
    const userMessage: ChatMessage = {
      username,
      walletAddress, // Include wallet address so ChatXPDisplay can fetch the level
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
    };
    socketRef.current?.emit("chat message", userMessage);
    setNewMessage("");
  };

  // Helper to calculate scale factor based on username length.
  // The longer the username, the smaller the text and XP badge.
  const getScale = (uname: string) => {
    const minScale = 0.6;
    const baseLength = 10;
    if (uname.length <= baseLength) return 1;
    const scale = 1 - (uname.length - baseLength) * 0.02;
    return Math.max(minScale, scale);
  };

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-[#49EACB] mb-2">Live Chat</h3>
        <ScrollArea className="h-[200px] mb-4">
          {messages.map((msg, index) => {
            const scale = getScale(msg.username);
            return (
              <div key={index} className="mb-2 flex items-start">
                {/* Render the ChatXPDisplay with responsive scale */}
                {msg.walletAddress && (
                  <ChatXPDisplay walletAddress={msg.walletAddress} scale={scale} />
                )}
                <div className="flex flex-col">
                  <span
                    className="font-bold break-words"
                    style={{
                      fontSize: `${16 * scale}px`,
                      background: "linear-gradient(90deg, #49EACB, #B6B6B6)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {msg.username}:{" "}
                  </span>
                  <span
                    className="text-sm break-words"
                    style={{
                      color: textColor,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {msg.message}
                  </span>
                </div>
              </div>
            );
          })}
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="flex flex-col space-y-2">
          <div className="relative w-full">
            <Input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value.slice(0, 80))}
              placeholder={isConnected ? "Type your message..." : "Connect wallet to chat"}
              className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white w-full"
              disabled={!isConnected}
              maxLength={80}
            />
            <div className="absolute right-2 bottom-1 text-xs">
              {newMessage.length}/80
            </div>
          </div>
          <Button
            type="submit"
            className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80"
            disabled={!isConnected}
          >
            Send
          </Button>
        </form>
      </div>
    </Card>
  );
}

/**
 * ChatXPDisplay Component
 *
 * Fetches and displays the XP level for a specific wallet address.
 * Its size scales down according to the provided "scale" prop, 
 * remains a circle, and uses a background image behind the level text.
 */
function ChatXPDisplay({
  walletAddress,
  scale = 1,
}: {
  walletAddress: string;
  scale?: number;
}) {
  const [userData, setUserData] = useState({ totalXp: 0, level: 0 });
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://kasino-backend-4818b4b69870.herokuapp.com";

  useEffect(() => {
    const fetchXP = async () => {
      try {
        const res = await axios.get(
          `${apiUrl}/api/user?walletAddress=${encodeURIComponent(walletAddress)}`
        );
        if (res.data.success && res.data.user) {
          setUserData({
            totalXp: res.data.user.totalXp || 0,
            level: res.data.user.level || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching XP for wallet", walletAddress, err);
      }
    };

    fetchXP();
    // Optionally, you can add a polling interval if you want updates.
    // const interval = setInterval(fetchXP, 5000);
    // return () => clearInterval(interval);
  }, [walletAddress, apiUrl]);

  // Determine styling based on the user's level.
  let borderColorClass = "";
  if (userData.level < 25) {
    borderColorClass = "border-[#49EACB] text-[#49EACB]";
  } else if (userData.level < 50) {
    borderColorClass = "border-yellow-400 text-yellow-400";
  } else if (userData.level < 75) {
    borderColorClass = "border-orange-500 text-orange-500";
  } else {
    borderColorClass = "border-red-500 text-red-500";
  }

  // Adjust dimensions based on scale (base size: 32px, base font: 12px).
  const size = 32 * scale;
  let fontSize = 12 * scale;

  // If level is 3 digits or more, make the text slightly smaller
  if (userData.level >= 100) {
    fontSize *= 0.85; // reduce by ~15%
  }

  return (
    <div
      className={`relative rounded-full border-2 flex-shrink-0 ${borderColorClass}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        marginRight: "0.25rem",
        overflow: "hidden",
      }}
    >
      {/* Background image behind the text */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/xpimage.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />
      {/* Level text on top of background */}
      <span
        className="relative flex items-center justify-center h-full w-full"
        style={{
          fontSize: `${fontSize}px`,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {userData.level}
      </span>
    </div>
  );
}
