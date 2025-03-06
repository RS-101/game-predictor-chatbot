import React, { useState, useRef, useEffect } from "react";
import "./style.css";

const AWANLLM_API_KEY = import.meta.env.VITE_API_KEY;;
const llm_model = "Meta-Llama-3-70B-Instruct";


interface ChatEntry {
  id: number;
  userMessage: string;
  responseMessage: string;
}

const frames = ["|", "/", "-", "\\"];

function formatResponseText(response: string): string {
  // Convert <think> blocks to a div with class "think"
  response = response.replace(/<think>([\s\S]*?)<\/think>/g, (_, content) => {
    const formattedContent = content.trim().replace(/\n{2,}/g, "<br><br>");
    return `<div class="think">${formattedContent}</div>`;
  });

  // Convert **bold text** to <strong>text</strong>
  response = response.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Convert numbered lists into HTML <ol> structure while preserving line breaks
  response = response.replace(
    /\d+\.\s\*\*(.*?)\*\*:\s(.*?)\./g,
    "<li><strong>$1</strong>: $2.</li>"
  );

  // Ensure each sentence stays on a new line
  response = response.replace(/\n/g, "<br>");

  // Wrap list items in <ol> if they exist
  if (response.includes("<li>")) {
    response = response.replace(/(<li>.*?<\/li>)/gs, "<ol>$1</ol>");
  }

  return response;
}

async function fetchData(user_message: string): Promise<string> {
  try {
    const url = "https://api.awanllm.com/v1/completions"; // Replace with your actual API URL

    const payload = {
      model: llm_model,
      prompt: user_message,
      repetition_penalty: 1.1,
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      max_tokens: 1024,
      stream: false,
    };

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AWANLLM_API_KEY}`, // Replace with your actual API key
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const llm_response = data.choices?.[0]?.text || "No response from AI.";

    return llm_response;
  } catch (error: any) {
    console.error("Error fetching data:", error);
    throw error;
  }
}


const ChatApp: React.FC = () => {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFrameIndex, setLoadingFrameIndex] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [answer, setAnswer] = useState("");


  const inputRef = useRef<HTMLInputElement>(null);
  const measureSpanRef = useRef<HTMLSpanElement>(null);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  // Dynamically adjust input width based on text content
  useEffect(() => {
    if (inputRef.current && measureSpanRef.current) {
      measureSpanRef.current.textContent = chatInput || inputRef.current.placeholder;
      measureSpanRef.current.style.font = window.getComputedStyle(inputRef.current).font;
      inputRef.current.style.width = `${measureSpanRef.current.offsetWidth - 15}px`;
    }
  }, [chatInput]);

  // Update loading frame when loading is active
  useEffect(() => {
    if (!isLoading) return;
  
    const interval: number = window.setInterval(() => {
      setLoadingFrameIndex((prev) => (prev + 1) % frames.length);
    }, 200);
  
    return () => clearInterval(interval);
  }, [isLoading]);
  
  const handleLogin = () => {
    if (answer.toLowerCase() === "123") {
      setIsLoggedIn(true);
    } else {
      alert("Wrong answer! Please try again.");
    }
  };


  const sendMessage = async () => {
    const message = chatInput.trim();
    if (!message) return;

    setIsLoading(true);

    try {
      const response = await fetchData(message);
      const formattedResponse = formatResponseText(response);

      const newEntry: ChatEntry = {
        id: Date.now(),
        userMessage: message,
        responseMessage: formattedResponse,
      };

      setChatHistory((prev) => [...prev, newEntry]);
    } catch (error: any) {
      console.error("Error fetching message:", error);
      const errorMessage = error?.message ? error.message : "Error fetching data";
      const errorEntry: ChatEntry = {
        id: Date.now(),
        userMessage: message,
        responseMessage: `<div class="error-message">Error: ${errorMessage}</div>`,
      };
      setChatHistory((prev) => [...prev, errorEntry]);
    }

    setChatInput("");
    setIsLoading(false);

    // Auto-scroll to the latest chat entry
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="input-group">
        <div className="popup-content">
          <p>Password is 123, it can be changed in chatbot.tsx </p>
          <input 
            className="log-in"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()} // Trigger login on Enter
          />
          <button 
          className="btn"
          onClick={handleLogin}>Submit</button>
        </div>
      </div>
    );
  }


  return (
    <div>
      {/* Welcome message */}
      <div className="history-chat-output">
        You can ask about everything you want to know. I will try my best to answer your question.
      </div>

      {/* Chat history container */}
      <div id="chat-history" className="chat-history" ref={chatHistoryRef}>
        {chatHistory.map((entry) => (
          <div key={entry.id} className="chat-entry">
            <div className="history-chat-input">{entry.userMessage}</div>
            <div
              className="history-chat-output"
              dangerouslySetInnerHTML={{ __html: entry.responseMessage }}
            />
          </div>
        ))}
      </div>

      {/* Input group */}
      <div className="input-group">
        <span id="measure-span" className="measure-span" ref={measureSpanRef}></span>
        <input
          type="text"
          id="chat-input"
          className="chat-input"
          placeholder="Type your message here"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={handleKeyPress}
          ref={inputRef}
        />
        <button id="send" className="btn btn-primary" onClick={sendMessage}>
          Send
        </button>
      </div>

      {/* Loading indicator container */}
      <div id="chat-container" className="chat-history">
        {isLoading && (
          <div className="history-chat-output">
            {`I am thinking ${frames[loadingFrameIndex]}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatApp;
