import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ChatWindow from "@/components/ChatWindow";
import ChatInput from "@/components/ChatInput";
import UsernameModal from "@/components/UsernameModal";
import { fetchChatHistory, sendChatMessage } from "@/lib/openai";
import type { ChatMessage } from "@/lib/openai";

const ChatPage = () => {
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem("aiChatUsername")
  );
  const [isModalOpen, setIsModalOpen] = useState(!username);
  const { toast } = useToast();

  // Fetch chat history for the user
  const {
    data: messages,
    isLoading: isLoadingHistory,
    refetch,
  } = useQuery({
    queryKey: username ? [`/api/messages/${username}`] : null,
    enabled: !!username,
  });

  // Send message mutation
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      if (!username) throw new Error("Username not set");
      return sendChatMessage(username, message);
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  // Handle username change
  const handleUsernameChange = (newUsername: string) => {
    localStorage.setItem("aiChatUsername", newUsername);
    setUsername(newUsername);
    setIsModalOpen(false);
    refetch();
  };

  // Handle message submit
  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;
    sendMessage({ message });
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md h-[600px] bg-white rounded-lg shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-4 flex items-center justify-between">
          <h1 className="text-white font-semibold text-xl">AI Chat Assistant</h1>
          <div className="flex items-center">
            <span className="text-white text-sm mr-2">{username || "Guest"}</span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-white opacity-80 hover:opacity-100 text-xs bg-accent px-2 py-1 rounded"
            >
              Change
            </button>
          </div>
        </div>

        {/* Chat Window */}
        <ChatWindow 
          messages={messages || []} 
          isLoading={isLoadingHistory || isSending} 
          username={username || "Guest"} 
        />

        {/* Chat Input */}
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isDisabled={isSending || !username} 
        />
      </div>

      {/* Username Modal */}
      {isModalOpen && (
        <UsernameModal
          initialUsername={username || ""}
          onSubmit={handleUsernameChange}
        />
      )}
    </div>
  );
};

export default ChatPage;
