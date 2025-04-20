import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import UsernameModal from "@/components/UsernameModal";
import { fetchChatHistory, sendChatMessage } from "@/lib/openai";
import { ChatMessage } from "@/lib/types";
import { BarChart2 } from "lucide-react";

const ChatPage = () => {
  const { toast } = useToast();
  const [username, setUsername] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(true);

  useEffect(() => {
    // Check if username is in localStorage
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      setShowModal(false);
      loadChatHistory(storedUsername);
    }
  }, []);

  const loadChatHistory = async (username: string) => {
    try {
      setIsLoading(true);
      const history = await fetchChatHistory(username);
      setMessages(history);
    } catch (error) {
      console.error("Error loading chat history:", error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    try {
      setIsLoading(true);
      
      // Optimistically add user message to UI
      const userMessage: ChatMessage = {
        id: messages.length + 1,
        content: message,
        role: "user",
        username,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMessage]);
      
      // Send message to API
      const response = await sendChatMessage(username, message);
      
      // Add AI response to UI
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameSubmit = (newUsername: string) => {
    setUsername(newUsername);
    localStorage.setItem("username", newUsername);
    setShowModal(false);
    loadChatHistory(newUsername);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-background border-b p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Chat with Reliability Analysis</h1>
          <Link href="/reliability">
            <Button variant="outline">
              <BarChart2 className="h-4 w-4 mr-2" />
              Reliability Dashboard
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden container mx-auto p-4 flex flex-col">
        <ChatWindow 
          messages={messages} 
          isLoading={isLoading} 
          username={username} 
        />
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isDisabled={isLoading || !username} 
        />
      </main>
      
      {showModal && (
        <UsernameModal
          initialUsername={username}
          onSubmit={handleUsernameSubmit}
        />
      )}
    </div>
  );
};

export default ChatPage;