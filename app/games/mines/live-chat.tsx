"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { io, Socket } from "socket.io-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWallet } from "@/contexts/WalletContext";

interface ChatMessage {
  username: string;
  message: string;
  timestamp: string; // Using ISO string format
}

interface LiveChatProps {
  textColor?: string;
}

export function LiveChat({ textColor = "#FFFFFF" }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef<Socket | null>(null);

  // Pull wallet state. We assume that once connected, the wallet provides a username.
  const { isConnected, username } = useWallet();

  useEffect(() => {
    // Connect to your Socket.IO server (update with your Heroku URL)
    socketRef.current = io("https://kasino-backend-4818b4b69870.herokuapp.com");

    // Listen for incoming chat messages
    socketRef.current.on("chat message", (msg: ChatMessage) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    // Cleanup on component unmount
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;
    if (!isConnected || !username) return; // Should never happen since input is disabled

    const userMessage: ChatMessage = {
      username, // use the wallet's username instead of "You"
      message: newMessage,
      timestamp: new Date().toISOString(),
    };

    // Emit the message to the server.
    // Do not update the messages locally here – let the server broadcast it.
    socketRef.current?.emit("chat message", userMessage);

    setNewMessage("");
  };

  return (
    <Card className="bg-[#49EACB]/5 border-[#49EACB]/10 backdrop-blur-sm overflow-hidden">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-[#49EACB] mb-2">Live Chat</h3>
        <ScrollArea className="h-[200px] mb-4">
          {messages.map((msg, index) => (
            <div key={index} className="mb-2">
              <span className="font-bold" style={{ color: textColor }}>
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
            onChange={(e) => setNewMessage(e.target.value)}
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
