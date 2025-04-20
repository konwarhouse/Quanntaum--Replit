import { useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import type { ChatMessage as ChatMessageType } from "@/lib/openai";

interface ChatWindowProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  username: string;
}

const ChatWindow = ({ messages, isLoading, username }: ChatWindowProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Show welcome message if no messages exist
  const showWelcomeMessage = messages.length === 0 && !isLoading;

  return (
    <div className="flex-1 p-4 overflow-y-auto message-container">
      <div className="flex flex-col space-y-4">
        {/* Welcome message */}
        {showWelcomeMessage && (
          <div className="flex items-start mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
              AI
            </div>
            <div className="ml-2 bg-aiMessage p-3 rounded-lg rounded-tl-none max-w-[80%]">
              <p className="text-gray-800">Welcome! I'm your AI assistant. How can I help you today?</p>
              <span className="text-xs text-gray-500 mt-1 block">Just now</span>
            </div>
          </div>
        )}

        {/* Message history */}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isUser={message.role === "user"}
            username={username}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
              AI
            </div>
            <div className="ml-2 bg-aiMessage p-3 rounded-lg rounded-tl-none">
              <div className="typing-indicator">
                <span>•</span>
                <span>•</span>
                <span>•</span>
              </div>
            </div>
          </div>
        )}

        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatWindow;
