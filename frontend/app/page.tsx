"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ChatInput from "@/components/ChatInput";
import UserMessage from "@/components/UserMessage";
import AIMessage from "@/components/AIMessage";
import DetectionConfirm from "@/components/DetectionConfirm";
import LiveVideoAnalysis from "@/components/LiveVideoAnalysis";
import {
  getSessions,
  createSession,
  getSessionDetails,
  sendMessage,
  deleteSession,
  updateDetectedItem,
  Session,
  Message,
  ChatResponse,
  DetectionData,
} from "@/lib/chatApi";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  responseType?: "text" | "detection" | "repair_results" | "clarification";
  data?: ChatResponse["data"];
}

interface PendingDetection {
  data: DetectionData;
  imageUrl?: string;
  sessionId: string;
}

export default function Home() {
  // Theme state
  const [isDark, setIsDark] = useState(false);
  
  // Sidebar state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Live video mode
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  // Session state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [detectedItem, setDetectedItem] = useState<DetectionData | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastImageUrl, setLastImageUrl] = useState<string | null>(null);
  
  // Pending detection confirmation
  const [pendingDetection, setPendingDetection] = useState<PendingDetection | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    loadSessions();
    
    // Check for dark mode preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load sessions
  const loadSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  // Create new session
  const handleNewSession = async () => {
    try {
      const session = await createSession();
      setSessions((prev) => [session, ...prev]);
      setCurrentSessionId(session.id);
      setMessages([]);
      setDetectedItem(null);
      setLastImageUrl(null);
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  // Select existing session
  const handleSelectSession = async (sessionId: string) => {
    try {
      const data = await getSessionDetails(sessionId);
      setCurrentSessionId(sessionId);
      setDetectedItem(data.detected_item || null);
      
      // Convert messages to chat format, preserving image_data
      const chatMessages: ChatMessage[] = data.messages.map((msg: Message) => ({
        id: String(msg.id),
        role: msg.role,
        content: msg.content,
        responseType: msg.metadata?.response_type as ChatMessage["responseType"],
        data: msg.metadata?.data as ChatMessage["data"],
        imageUrl: msg.image_data || undefined,  // Use stored base64 image
      }));
      
      // Set lastImageUrl to the most recent user image for AI responses
      const lastUserImage = [...data.messages].reverse().find((m: Message) => m.role === "user" && m.image_data);
      if (lastUserImage?.image_data) {
        setLastImageUrl(lastUserImage.image_data);
      }
      
      setMessages(chatMessages);
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      
      // Remove from local state
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      
      // If deleted current session, clear the view
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
        setDetectedItem(null);
        setLastImageUrl(null);
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  // Handle live detection completion
  const handleLiveDetectionComplete = async (detectionResult: DetectionData) => {
    // Save detection to session
    setDetectedItem(detectionResult);
    
    // Add detection message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: "[Live video analysis]",
    };
    setMessages((prev) => [...prev, userMessage]);

    // Show detection
    const detectionMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: `I identified this as a **${detectionResult.brand ? detectionResult.brand + " " : ""}${detectionResult.object}**.\n\n**Condition:** ${detectionResult.condition}\n\nIssues detected:\n${detectionResult.issues?.map((i) => `• ${i}`).join("\n")}\n\nWould you like me to search for repair guides and spare parts?`,
      responseType: "detection",
      data: detectionResult,
    };
    setMessages((prev) => [...prev, detectionMessage]);

    // Exit live mode
    setIsLiveMode(false);
  };

  // Show live video component if in live mode
  if (isLiveMode) {
    if (!currentSessionId) {
      handleNewSession();
      return null;
    }
    return (
      <LiveVideoAnalysis
        sessionId={currentSessionId}
        onDetectionComplete={handleLiveDetectionComplete}
      />
    );
  }

  // Handle detection confirmation - user confirms/edits details and searches
  const handleConfirmDetection = async (confirmedData: DetectionData) => {
    if (!pendingDetection) return;
    
    // Update detected item with confirmed data
    setDetectedItem(confirmedData);
    
    // First, update the detected item in the database so searches use the corrected info
    try {
      await updateDetectedItem(pendingDetection.sessionId, confirmedData);

    } catch (error) {
      console.error("Failed to update detected item:", error);
    }
    
    // Add the detection message to chat
    const detectionMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: `I identified this as a **${confirmedData.brand ? confirmedData.brand + " " : ""}${confirmedData.object}${confirmedData.model ? ` (${confirmedData.model})` : ""}**.\n\n**Condition:** ${confirmedData.condition}\n\n${confirmedData.issues.length > 0 ? "**Issues:**\n" + confirmedData.issues.map(i => `• ${i}`).join("\n") : ""}`,
      responseType: "detection",
      data: confirmedData,
      imageUrl: pendingDetection.imageUrl,
    };
    setMessages((prev) => [...prev, detectionMessage]);
    
    // Clear pending detection
    setPendingDetection(null);
    
    // Automatically search for repair resources with the confirmed details
    setIsLoading(true);
    try {
      // Use a simple trigger message - the backend will use the updated detected_item from DB
      const response = await sendMessage("Find repair solutions", pendingDetection.sessionId);
      
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now() + 1}`,
        role: "assistant",
        content: response.message,
        responseType: response.response_type,
        data: response.data,
        imageUrl: pendingDetection.imageUrl,
      };
      setMessages((prev) => [...prev, aiMessage]);
      loadSessions(); // Refresh to show updated title
    } catch (error) {
      console.error("Failed to search:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle skip confirmation - just show basic detection without search
  const handleSkipConfirmation = () => {
    if (!pendingDetection) return;
    
    // Add the detection message to chat without searching
    const detectionMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: `I identified this as a **${pendingDetection.data.brand ? pendingDetection.data.brand + " " : ""}${pendingDetection.data.object}**.\n\n**Condition:** ${pendingDetection.data.condition}\n\nClick the buttons below to search for repair resources, or add more details for better results.`,
      responseType: "detection",
      data: pendingDetection.data,
      imageUrl: pendingDetection.imageUrl,
    };
    setMessages((prev) => [...prev, detectionMessage]);
    
    // Clear pending detection
    setPendingDetection(null);
  };

  // Send message
  const handleSendMessage = async (message: string, image?: File) => {
    // Create image URL for display
    let imageUrl: string | undefined;
    if (image) {
      imageUrl = URL.createObjectURL(image);
      setLastImageUrl(imageUrl);
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message || (image ? "What's wrong with this?" : ""),
      imageUrl,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessage(message, currentSessionId || undefined, image);
      
      // Update session ID if new
      if (!currentSessionId) {
        setCurrentSessionId(response.session_id);
        loadSessions(); // Refresh session list
      }

      // If detection response, show confirmation dialog instead of adding message
      if (response.response_type === "detection" && response.data) {
        const detectionData: DetectionData = {
          object: response.data.object || "",
          brand: response.data.brand || "",
          model: response.data.model || "",
          condition: response.data.condition || "",
          issues: response.data.issues || [],
          description: response.data.description || "",
        };
        
        // Store pending detection for confirmation
        setPendingDetection({
          data: detectionData,
          imageUrl: imageUrl || lastImageUrl || undefined,
          sessionId: response.session_id,
        });
        
        setDetectedItem(detectionData);
      } else {
        // Non-detection response - add normally
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: response.message,
          responseType: response.response_type,
          data: response.data,
          imageUrl: imageUrl || lastImageUrl || undefined,
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        responseType: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Header */}
        <Header
          onMenuClick={() => setIsMobileMenuOpen(true)}
          isDark={isDark}
          onToggleDark={toggleDarkMode}
        />

        {/* Chat Area */}
        <div className="flex-1 relative overflow-y-auto p-4 md:p-10 blueprint-grid overflow-x-hidden">
          {/* Messages */}
          <div className="max-w-5xl mx-auto flex flex-col gap-8 md:gap-10 relative z-10 pb-40">
            {/* Welcome message if no messages */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[var(--terracotta)]/10 border border-[var(--terracotta)]/30 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-4xl md:text-5xl text-[var(--terracotta)]">
                    build_circle
                  </span>
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--earth-dark)] mb-4">
                  Welcome to Repair.AI
                </h2>
                <p className="text-[var(--earth-muted)] max-w-md text-sm md:text-base">
                  Upload a photo of something broken and I'll help you diagnose the issue, 
                  find repair guides, video tutorials, and spare parts.
                </p>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg) => (
              msg.role === "user" ? (
                <UserMessage
                  key={msg.id}
                  content={msg.content}
                  imageUrl={msg.imageUrl}
                />
              ) : (
                <AIMessage
                  key={msg.id}
                  content={msg.content}
                  responseType={msg.responseType || "text"}
                  data={msg.data}
                  imageUrl={msg.imageUrl}
                  onAction={(action: "parts" | "guide" | "video") => {
                    // Trigger search based on action type
                    const actionMessages: Record<"parts" | "guide" | "video", string> = {
                      parts: "Find spare parts for this item",
                      guide: "Find repair guides for this item",
                      video: "Find video tutorials for this item"
                    };
                    handleSendMessage(actionMessages[action]);
                  }}
                />
              )
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <AIMessage
                content=""
                responseType="text"
                isLoading={true}
              />
            )}

            {/* Detection Confirmation Dialog */}
            {pendingDetection && !isLoading && (
              <DetectionConfirm
                data={pendingDetection.data}
                imageUrl={pendingDetection.imageUrl}
                onConfirm={handleConfirmDetection}
                onCancel={handleSkipConfirmation}
              />
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="relative">
          {/* Live Video Toggle Button */}
          <button
            onClick={() => {
              if (!currentSessionId) {
                handleNewSession();
              }
              setIsLiveMode(true);
            }}
            className="absolute right-4 -top-12 md:-top-14 px-4 py-2 bg-gradient-to-r from-[var(--terracotta)] to-orange-500 hover:from-[var(--terracotta)]/90 hover:to-orange-500/90 text-white text-sm font-medium rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 z-50"
          >
            <span className="material-symbols-outlined text-lg">videocam</span>
            Live
          </button>
          
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </main>
    </>
  );
}
