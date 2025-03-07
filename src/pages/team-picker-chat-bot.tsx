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
    
    const llm_response = data.choices?.[0]?.message?.content || "No response from AI.";
    console.log("LLM response:", llm_response);


    return llm_response;
  } catch (error: any) {
    console.error("Error fetching data:", error);
    throw error;
  }
  return "Sorry, I didn't understand that. Could you please rephrase?";
}

async function classifyIntent(userMessage: string): Promise<string> {
  const system_prompt = `You are an intent classifier. Given a user input, classify it into one of the following intents:
    - greeting
    - team_prediction
    - player_list_provided
    - affirmative
    - negative
    - question_on_players
    - question_on_teams
    - player_update
   
   
    - digression
    - fallback (if it doesn't match any intent)

    Respond only with the intent name.`;

  const response = await callLLM(system_prompt, userMessage);
  return response;
}

async function extractTeams(userMessage: string): Promise<string> {
  const system_prompt = `Extract the names of exactly two teams from the user's input and return them as a comma-separated list in lowercase. If the input does not contain two distinct team names, return the word "error" instead.
    Example Behavior:

    User: Will Team A or Team B win?
    Chatbot: team a, team b

    User: Will Team Alpha defeat Team Beta?
    Chatbot: team alpha, team beta`;


  const response = await callLLM(system_prompt, userMessage);
  return response;
}

async function extractPlayers(userMessage: string): Promise<string> {
  const system_prompt = `Extract the names of players from two different teams mentioned in the user's input. Return only and nothing but the players as two separate comma-separated lists, formatted in lowercase. If the input does not contain at least one player from each of two teams, return the word "error" instead.
    Example Behavior:

    Valid Inputs:
    User: Will Messi and Ronaldo outperform Neymar and Mbappé?
    Chatbot: messi, ronaldo | neymar, mbappé

    User: Do you think LeBron James and Anthony Davis can beat Stephen Curry and Klay Thompson?
    Chatbot: lebron james, anthony davis | stephen curry, klay thompson

    Invalid Inputs (Error Case):
    User: Will Messi score today?
    Chatbot: error

    User: Who is the best player?
    Chatbot: error`;

  const response = await callLLM(system_prompt, userMessage);
  return response;
}

async function checkIfTeamExists(teamA: string, teamB: string): Promise<boolean> { 
  // Idea: Call database to check if teams exist
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
  return true;
}

async function checkIfPlayersExists(teamA: string, teamB: string): Promise<boolean> {
  // Idea: Call database to check if players exist
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
  return true;
}

async function getPlayersFromTeams(teamA: string, teamB: string): Promise<{ [team: string]: string[] }> {
  // Idea: Call database to get current players on provided teams

  const players = {
    [teamA]: ["Player A1", "Player A2"],
    [teamB]: ["Player B1", "Player B2"],
  };

  return players;
}

async function predictOnPlayers(players: { [team: string]: string[] }): Promise<string> {

  // Idea: Call model to get prediction based on players
  const system_prompt = `Just guess the winner between two teams based on the provided players. Provide the prediction as a short sentence.`;
  const userMessage = `${players}`;

  const response = await callLLM(system_prompt, userMessage);
  return response;
}

async function updatePlayer(prompt: string, players: { [team: string]: string[] }): Promise<string> {

  // Idea: Call model to get prediction based on players
  const system_prompt = `please update the players for the teams. Provide the updated players as a comma-separated list in lowercase.`;
  const userMessage = `current players ${players}` + "user input:" + prompt;

  const response = await callLLM(system_prompt, userMessage);
  return response;
}


// Define an interface for the team picker conversation context.
interface TeamPickerContext {
  history: Array<{ user: string; bot: string }>;
  state: "initial" | "awaitingConfirmation" | "awaitingPlayerList" | "PredictionProvided" | "flowProvided";
  teams?: { teamA: string; teamB: string };
  players?: { [team: string]: string[] };
}


export async function handleTeamPicker(userInput: string, context: TeamPickerContext): Promise<string | void> {
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

  if (intent === "player_list_provided") {
    context.state = "awaitingPlayerList";
  }

  if (intent === "question_on_players" || intent === "question_on_teams") {
    // check if players are present in context.
    if (!context.players && context.teams) {
      context.players = await getPlayersFromTeams(context.teams.teamA, context.teams.teamB);
    }
    if (context.players && context.teams) {
      return `The players for ${context.teams?.teamA} are
       ${context.players[context.teams?.teamA].join(", ")} and 
       for ${context.teams?.teamB} are
        ${context.players[context.teams?.teamB].join(", ")}.<br><br>` +
       context.history[context.history.length - 1].bot;

    }

    context.state = "initial";
    return "I could not find any players. <br><br>" + context.history[context.history.length - 1].bot;
  }


  // State machine to handle different stages of the conversation.
  if (context.state === "initial") {
    if (intent === "team_prediction") {

      // Extract team names from the user input.
      const stringWithTeams = await extractTeams(input);
      const listOfTeams = stringWithTeams.split(",").map(team => team.trim()); // Trim spaces
      
      if (listOfTeams.length !== 2) {
        return "Please provide exactly two team names for prediction.";
      } else {
        context.teams = { teamA: listOfTeams[0], teamB: listOfTeams[1] };
        console.log("Extracted teams:", context.teams);
      }

      const teamsExist = await checkIfTeamExists(context.teams.teamA, context.teams.teamB);
      if (!teamsExist) {
        return "One or both of the provided teams do not exist. Please provide valid team names.";
      }

      context.state = "awaitingConfirmation";
      return "Are you using the current players?";
    } else {
      return "Please ask which teams will win by mentioning them like: 'Which of these teams will win: Team A or Team B'?";
    }
  } else if (context.state === "awaitingConfirmation") {
    // Check if the classified intent is affirmative (e.g., "yes", "yeah", "sure") or negative.
    if (intent === "affirmative") {
      // Process using current players.

      context.players = await getPlayersFromTeams(context.teams?.teamA || "", context.teams?.teamB || "");  

      const prediction = await predictOnPlayers(context.players);

      context.state = "PredictionProvided";
      return prediction + "<br><br>Do you want to predict using other players?";

    } else if (intent === "negative") {
      context.state = "awaitingPlayerList";
      return `Please provide the list of players for ${context.teams?.teamA} and ${context.teams?.teamB}.`;
    }  
    else {
      return "Please answer with something like 'yes' or 'no'. Are you using the current players?";
    }
  } else if (context.state === "awaitingPlayerList" ) {

    // Extract player names from the user input.
    const stringWithPlayers = await extractPlayers(input);

    if (stringWithPlayers === "error") {
      return "Please provide the players for both teams.";
    }

    
    const listOfPlayers = stringWithPlayers.split("|").map(team => team.trim()); // Trim spaces

    console.log("list of all provided players:", listOfPlayers);

    // check if players exist based on the extracted player names.
    const playersExist = await checkIfPlayersExists(context.teams?.teamA || "", context.teams?.teamB || "");
    if (!playersExist) { 
      return "One or both of the provided players do not exist. Please provide valid player names.";
    }

    context.players = {
      [context.teams?.teamA || "Team A"]: listOfPlayers[0].split(",").map(player => player.trim()),
      [context.teams?.teamB || "Team B"]: listOfPlayers[1].split(",").map(player => player.trim()),
    };

    console.log("Extracted players:", context.players);

    const prediction = await predictOnPlayers(context.players);
    context.state = "PredictionProvided";

    return prediction + "<br><br>Do you want to predict using other players?";

  } else if (context.state === "PredictionProvided") {
    
    // if affirmative, predict using other players
    if (intent === "affirmative") {
      context.state = "awaitingPlayerList";
      return `Please provide the list of players for ${context.teams?.teamA} and ${context.teams?.teamB}.`;
    } else if (intent === "negative") {
      context.state = "flowProvided";
      return "What else do you want to know?";
    } else if (intent === "team_prediction") {
      context.state = "initial";
       handleTeamPicker(input, context);
    } else if (intent === "player_update") {
      if (!context.players) { 
        context.state = "awaitingPlayerList";
        return "Please provide the list of players for both teams.";
      } else {
        const updatedPlayers = await updatePlayer(input, context.players);
        
        const listOfPlayers = updatedPlayers.split("|").map(team => team.trim()); // Trim spaces

        console.log("list of all provided players:", listOfPlayers);
    
        // check if players exist based on the extracted player names.
        const playersExist = await checkIfPlayersExists(context.teams?.teamA || "", context.teams?.teamB || "");
        if (!playersExist) { 
          return "One or both of the provided players do not exist. Please provide valid player names.";
        }
    
        context.players = {
          [context.teams?.teamA || "Team A"]: listOfPlayers[0].split(",").map(player => player.trim()),
          [context.teams?.teamB || "Team B"]: listOfPlayers[1].split(",").map(player => player.trim()),
        };
    
        console.log("Extracted players:", context.players);
    
        const prediction = await predictOnPlayers(context.players);
        context.state = "PredictionProvided";
    
        return prediction + "<br><br>Do you want to predict using other players?";    
      }      
    } else {
      return "Please answer with something like 'yes' or 'no'. Do you want to predict using other players?";
    }

    return "What else do you want to know?";
  }
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
      if (response === undefined) return;
      const formattedResponse = formatResponseText(response);

      const newEntry: ChatEntry = {
        id: Date.now(),
        userMessage: message,
        responseMessage: formattedResponse,
      };

      setChatHistory((prev) => [...prev, newEntry]);
      teamContext.history.push({ user: message, bot: formattedResponse });
    } catch (error: any) {
      console.error("Error fetching message:", error);
      const errorMessage = error?.message ? error.message : "Error fetching data";
      const errorEntry: ChatEntry = {
        id: Date.now(),
        userMessage: message,
        responseMessage: `<div class="error-message">Error: ${errorMessage}</div>`,
      };
      setChatHistory((prev) => [...prev, errorEntry]);
      teamContext.history.push({ user: message, bot: errorMessage });

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
