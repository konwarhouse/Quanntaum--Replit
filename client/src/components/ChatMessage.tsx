import { format } from "date-fns";
import type { ChatMessage as ChatMessageType } from "@/lib/openai";

interface ChatMessageProps {
  message: ChatMessageType;
  isUser: boolean;
  username: string;
}

const ChatMessage = ({ message, isUser, username }: ChatMessageProps) => {
  // Format the timestamp
  const formattedTime = (() => {
    const now = new Date();
    const messageTime = new Date(message.timestamp);
    
    // If message is from today, show "Just now" or "X min ago"
    if (messageTime.toDateString() === now.toDateString()) {
      const diffMinutes = Math.round((now.getTime() - messageTime.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes} min ago`;
      return `${Math.floor(diffMinutes / 60)} hr ago`;
    }
    
    // Otherwise show the date
    return format(messageTime, "MMM d, h:mm a");
  })();

  // Format the AI message content to handle lists and formatting
  const formatContent = (content: string) => {
    // Replace line breaks with <br> tags
    const withLineBreaks = content.replace(/\n/g, "<br>");
    
    // Simple formatting for lists (• Text)
    const withListFormatting = withLineBreaks.replace(
      /•\s+([^\n<]+)/g,
      "<li>$1</li>"
    );
    
    // Wrap lists in <ul> tags if there are list items
    const formattedContent = withListFormatting.includes("<li>")
      ? withListFormatting.replace(
          /(<li>.*?<\/li>)+/g,
          "<ul class='list-disc list-inside text-gray-800 mt-2'>$&</ul>"
        )
      : withListFormatting;
    
    return formattedContent;
  };

  return (
    <div className={`flex ${isUser ? "flex-row-reverse" : ""} items-start mb-4`}>
      <div className={`w-8 h-8 rounded-full ${isUser ? "bg-accent" : "bg-primary"} flex items-center justify-center text-white flex-shrink-0`}>
        {isUser ? username.charAt(0).toUpperCase() : "AI"}
      </div>
      <div className={`${isUser ? "mr-2 bg-userMessage rounded-tr-none" : "ml-2 bg-aiMessage rounded-tl-none"} p-3 rounded-lg max-w-[80%]`}>
        <div 
          className="text-gray-800"
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
        <span className="text-xs text-gray-500 mt-1 block">{formattedTime}</span>
      </div>
    </div>
  );
};

export default ChatMessage;
