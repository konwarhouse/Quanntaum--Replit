import { apiRequest } from "./queryClient";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: number;
  content: string;
  role: MessageRole;
  username: string;
  timestamp: Date;
}

export async function fetchChatHistory(username: string): Promise<ChatMessage[]> {
  const response = await fetch(`/api/messages/${encodeURIComponent(username)}`, {
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch chat history: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Convert timestamp strings to Date objects
  return data.map((message: any) => ({
    ...message,
    timestamp: new Date(message.timestamp),
  }));
}

export async function sendChatMessage(username: string, message: string): Promise<ChatMessage> {
  const response = await apiRequest("POST", "/api/chat", {
    username,
    message,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success || !data.message) {
    throw new Error("Invalid response from server");
  }
  
  // Convert timestamp string to Date object
  return {
    ...data.message,
    timestamp: new Date(data.message.timestamp),
  };
}
