"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ChatMessage {
  username: string
  message: string
  timestamp: Date
}

interface LiveChatProps {
  textColor?: string
}

export function LiveChat({ textColor = "#FFFFFF" }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")

  useEffect(() => {
    // Simulated chat messages
    const simulatedMessages: ChatMessage[] = [
      { username: "Player1", message: "Good luck everyone!", timestamp: new Date() },
      { username: "CryptoKing", message: "Just won 100 KAS!", timestamp: new Date() },
      { username: "MinesExpert", message: "Be careful of those mines!", timestamp: new Date() },
    ]

    setMessages(simulatedMessages)

    // Simulated new messages every 5 seconds
    const interval = setInterval(() => {
      const newSimulatedMessage: ChatMessage = {
        username: `Player${Math.floor(Math.random() * 100)}`,
        message: `Random message ${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date(),
      }
      setMessages((prevMessages) => [...prevMessages, newSimulatedMessage])
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleSendMessage = () => {
    if (newMessage.trim() !== "") {
      const userMessage: ChatMessage = {
        username: "You",
        message: newMessage,
        timestamp: new Date(),
      }
      setMessages((prevMessages) => [...prevMessages, userMessage])
      setNewMessage("")
    }
  }

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
        <div className="flex space-x-2">
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="bg-[#49EACB]/5 border-[#49EACB]/10 text-white flex-grow"
          />
          <Button onClick={handleSendMessage} className="bg-[#49EACB] text-black hover:bg-[#49EACB]/80">
            Send
          </Button>
        </div>
      </div>
    </Card>
  )
}

