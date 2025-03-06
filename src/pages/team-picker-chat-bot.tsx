import React, { useState, useRef, useEffect } from "react";
import "./team-picker-style.css";

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

async function callLLM(system_prompt: string, prompt: string): Promise<string> {
  try {
    const url = "https://api.awanllm.com/v1/chat/completions"; // API endpoint

    const payload = {
      model: llm_model,
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: prompt }, 
      ],
      repetition_penalty: 1.1,
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      max_tokens: 1024,
      stream: false,
    };

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AWANLLM_API_KEY}`, 
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

    console.log("LLM response data:", data);

    // Correct way to extract the response
    const llm_response = data.choices?.[0]?.message?.content || "No response from AI.";

    console.log("LLM response:", llm_response);


    return llm_response;
  } catch (error: any) {
    console.error("Error fetching data:", error);
    throw error;
  }
}




async function classifyIntent(userMessage: string): Promise<string> {
  const system_prompt = `You are an intent classifier. Given a user input, classify it into one of the following intents:
    - team_inquiry
    - affirmative
    - negative
    - player_list_provided
    - player_update
    - digression
    - fallback (if it doesn't match any intent)

    Respond only with the intent name.`;

  const response = await callLLM(system_prompt, userMessage);
  return response;
}

// Define an interface for the team picker conversation context.
interface TeamPickerContext {
  history: Array<{ user: string; bot: string }>;
  state: "initial" | "awaitingConfirmation" | "awaitingPlayerList" | "awaitingCurrentPlayers" | "flowProvided";
  teams?: { teamA: string; teamB: string };
  players?: { [team: string]: string[] };
}


export async function handleTeamPicker(userInput: string, context: TeamPickerContext): Promise<string> {
  // Normalize the input.
  const input = userInput.trim();

  // Use classifyIntent to determine the intent behind the input.
  let intent: string = "";
  try {
    intent = await classifyIntent(input);
  } catch (error) {
    // Fallback if intent classification fails.
    intent = "";
  }

  // State machine to handle different stages of the conversation.
  if (context.state === "initial") {
    // Expect a question like: "Which of these teams will win: Team A or Team B"
    const teamRegex = /teams? will win:\s*(.*?)\s+or\s+(.*)/i;
    const match = userInput.match(teamRegex);
    if (match) {
      // Extract team names and update context.
      context.teams = { teamA: match[1].trim(), teamB: match[2].trim() };
      context.state = "awaitingConfirmation";
      return "Are you using the current players?";
    } else {
      return "Please ask which teams will win by mentioning them like: 'Which of these teams will win: Team A or Team B'?";
    }
  } else if (context.state === "awaitingConfirmation") {
    // Check if the classified intent is affirmative (e.g., "yes", "yeah", "sure") or negative.
    if (intent === "affirmative") {
      // Process using current players.
      context.state = "flowProvided";
      const prompt = `Predict the winner between ${context.teams?.teamA} and ${context.teams?.teamB} using current players.`;
      const apiResponse = await callLLM("TeamPrediction", prompt);
      return apiResponse;
    } else if (intent === "negative") {
      // Request the list of players for both teams.
      context.state = "awaitingPlayerList";
      return `Please provide the list of players for ${context.teams?.teamA} and ${context.teams?.teamB}.`;
    } else {
      return "Please answer with something like 'yes' or 'no'. Are you using the current players?";
    }
  } else if (context.state === "awaitingPlayerList") {
    // Expect the user to provide a list of players.
    if (input.toLowerCase().includes("list of players")) {
      // After receiving the list, ask for the current players.
      context.state = "awaitingCurrentPlayers";
      return "Please provide the current players for both teams.";
    } else {
      return "I didn't catch that. Could you please provide the list of players for both teams?";
    }
  } else if (context.state === "awaitingCurrentPlayers") {
    // Handle potential digressions or player updates.
    if (input.toLowerCase().includes("list of players")) {
      // User is requesting to see the players.
      const playersResponse = await callLLM("GetPlayers", `Fetch players for ${context.teams?.teamA} and ${context.teams?.teamB}.`);
      // Simulate storing fetched players.
      context.players = {
        [context.teams?.teamA || "Team A"]: ["Player A1", "Player A2"],
        [context.teams?.teamB || "Team B"]: ["Player B1", "Player B2"],
      };
      return playersResponse;
    } else if (input.toLowerCase().includes("change players")) {
      // Handle a digression where the user wants to update players.
      if (context.players && context.teams) {
        // Simulate updating player information (e.g., replacing "Player C" with "Player D").
        // In a real implementation, you would parse the user input to extract these details.
        return `Updated players for ${context.teams.teamB}: Replaced player C with player D.`;
      }
      return "No player data available to update.";
    } else {
      // Assume the user provided current players information.
      context.state = "flowProvided";
      const prompt = `Predict the winner between ${context.teams?.teamA} and ${context.teams?.teamB} using the provided current players: ${userInput}.`;
      const prediction = await callLLM("TeamPrediction", prompt);
      return prediction;
    }
  } else if (context.state === "flowProvided") {
    return "The prediction flow has already been provided. Let me know if you need any further adjustments.";
  }
  return "I'm not sure how to proceed. Can you please clarify your request?";
}


const teamContext: TeamPickerContext = {
  history: [],
  state: "initial",
};

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
      const response = await handleTeamPicker(message, teamContext);
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
