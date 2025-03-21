"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { io, Socket } from "socket.io-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWallet } from "@/contexts/WalletContext";
import axios from "axios";
// Import XPDisplay as used in your nav and other games
import { XPDisplay } from "@/app/page";

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
      walletAddress, // Include wallet address so XPBadge can fetch the level
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
    };
    socketRef.current?.emit("chat message", userMessage);
    setNewMessage("");
  };

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-[#49EACB] mb-2">Live Chat</h3>
        <ScrollArea className="h-[200px] mb-4">
          {messages.map((msg, index) => (
            <div key={index} className="mb-2 flex items-center">
              {/* Render a smaller XPBadge next to the username */}
              {msg.walletAddress && <XPBadge walletAddress={msg.walletAddress} />}
              <span
                className="font-bold"
                style={{
                  background: "linear-gradient(90deg, #49EACB, #B6B6B6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {msg.username}:{" "}
              </span>
              <span style={{ color: textColor }}>{msg.message}</span>
            </div>
          ))}
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value.slice(0, 100))}
            placeholder={isConnected ? "Type your message..." : "Connect wallet to chat"}
            className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white flex-grow"
            disabled={!isConnected}
          />
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
 * XPBadge Component
 *
 * Wraps the imported XPDisplay component (from the nav) in a container that scales it down
 * (making it smaller) and disables pointer events (thus disabling any hover popups).
 */
function XPBadge({ walletAddress }: { walletAddress: string }) {
  return (
    <div
      style={{
        transform: "scale(0.6)",
        transformOrigin: "left center",
        pointerEvents: "none",
        marginRight: "0.25rem",
      }}
    >
      <XPDisplay walletAddress={walletAddress} />
    </div>
  );
}
