// const AWANLLM_API_KEY = import.meta.env.VITE_API_KEY;
const AWANLLM_API_KEY = "d2b04a13-3233-462b-bd6f-a8677458b3c2";
// const AWANLLM_API_KEY = "f13903ac-0b86-4b76-9037-bbee6b06b789";
const llm_model = "Meta-Llama-3-70B-Instruct";
// const llm_model = "Meta-Llama-3-8B-Instruct";

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
}

async function classifyIntent(userMessage: string): Promise<string> {
    // Check common suggestions first
    if (userMessage === "I want to make a fantasy league team." ||
        userMessage === "I want to use predictions for betting." ||
        userMessage === "I'm a coach of a basketball team." ||
        userMessage === "I own a sports team.") {
        return "user_information_provided";
    }

    if (userMessage === "Predict the game outcome of Celtics vs. Nuggets." ||
        userMessage === "Will Warriors beat Spurs?") {
        return "team_prediction";
    }

    if (userMessage === "How tall is LeBron James?" ||
        userMessage === "How tall is Kevin Durant?") {
        return "question_on_single_player";
    }

    if (userMessage === "Yes, let's go" ||
        userMessage === "Yes") {
        return "affirmative";
    }

    if (userMessage === "No way" ||
        userMessage === "No") {
        return "negative";
    }

    if (userMessage === "Who are the current players?") {
        return "question_on_teams_or_players";
    }

    if (userMessage.startsWith("Replace ")) {
        return "player_update";
    }

    // If no direct matches, use LLM classification
    const system_prompt = `You are an intent classifier. Given a user input, classify it into one of the following intents:
    - greeting
    - user_information_provided
    - team_prediction
    - player_list_provided
    - affirmative
    - negative
    - question_on_teams_or_players
    - question_on_single_player
    - player_update
    - chitchat
    - fallback (if it doesn't match any intent)

    Example Behavior:
      User: Hi there!
      Chatbot: greeting

      User: My name is John and I like basketball
      Chatbot: user_information_provided
      
      User: Will the Celtics beat the Lakers?
      Chatbot: team_prediction

      User: For Celtics: Tatum, Brown, Smart | For Lakers: James, Davis, Westbrook
      Chatbot: player_list_provided

      User: Yes please
      Chatbot: affirmative

      User: No thanks
      Chatbot: negative

      User: Who are the current players?
      Chatbot: question_on_teams_or_players

      User: How tall is LeBron James?
      Chatbot: question_on_single_player

    Respond only with the intent name.`;

    const response = await callLLM(system_prompt, userMessage);
    return response;
}

async function classifyUser(userMessage: string): Promise<"casual_fan" | "serious_fan" | "coach" | "orginisation" | "no_type"> {
    const system_prompt = `You are an classifier. Given a user input, classify it into one of the following typer:
    - casual_fan
    - serious_fan
    - coach
    - orginisation

    - fallback (if it doesn't match any intent)

    Respond only with the intent name.
    
    Example Behavior:
      User: I use this app for my fantasy league.
      Chatbot: casual_fan
      
      User: I am a coach of a basket team.
      Chatbot: coach
      
      User: I use this app to place bets.
      Chatbot: serious_fan
      
      User: I own a sports team.
      chatbot: orginisation`;

    const response = await callLLM(system_prompt, userMessage);


    // we match response to "casual_fan" | "serious_fan" | "coach" | "orginisation"
    if (response === "fallback") {
        return "no_type";
    }

    return response as "casual_fan" | "serious_fan" | "coach" | "orginisation";
}

async function extractNameOfUser(userMessage: string): Promise<string> {
    const system_prompt = `Extract the name of the user from the user's input. Response only with the name. If no name is provided, return the word "error" instead.`;

    const response = await callLLM(system_prompt, userMessage);
    return response;
}

async function chitchat(userMessage: string): Promise<string> {
    const system_prompt = `You are a chitchat bot. Given a user input, respond with an appropriate chitchat response.
    Example Behavior:
    User: How are you?
    Chatbot: I'm doing well, thank you! How can I help you today?
    
    User: What's your favorite movie?
    Chatbot: I love all movies! What's your favorite?`;

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

    teamA = teamA.toLowerCase();
    teamB = teamB.toLowerCase();
    // Idea: Call database to check if teams exist
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    return true;
}

async function checkIfPlayersExists(teamA: string, teamB: string): Promise<boolean> {


    teamA = teamA.toLowerCase();
    teamB = teamB.toLowerCase();
    // Idea: Call database to check if players exist
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    return true;
}

async function getPlayersFromTeams(teamA: string, teamB: string): Promise<{ [team: string]: string[] }> {
    // Idea: Call database to get current players on provided teams


    const system_prompt = `Given the names of two teams, 
  return 5 current players for each team. Return only and nothing but the players as two separate comma-separated lists with '|' separating the two teams. 
  Example Behavior:

  User: Lakers and Bulls?
  Chatbot: Kareem Abdul-Jabbar, Elgin Baylor, Kobe Bryant, Wilt Chamberlain, Serbien Vlade Divac | Josh Giddey, Lonzo Ball, Matas Buzelis, Coby White, Jalen Smith`;

    const userMessage = `${teamA} and ${teamB}`;

    const stringWithPlayers = await callLLM(system_prompt, userMessage);


    const listOfPlayers = stringWithPlayers.split("|").map(team => team.trim()); // Trim spaces

    console.log("list of all provided players:", listOfPlayers);

    const players = {
        [teamA]: listOfPlayers[0].split(",").map(player => player.trim()),
        [teamB]: listOfPlayers[1].split(",").map(player => player.trim()),
    };

    return players;
}

async function predictOnPlayers(players: { [team: string]: string[] }): Promise<string> {

    // Idea: Call model to get prediction based on players
    const system_prompt = `Just guess the winner between two teams based on the provided players. Provide the prediction as a short sentence.`;
    var userMessage = `The players for the teams are: `;

    Object.keys(players).forEach((team) => {
        userMessage += `${team} with players: ${players[team].join(", ")}`;
    });

    console.log("User message to prediction:", userMessage);

    const response = await callLLM(system_prompt, userMessage);
    return response;
}

async function updatePlayer(prompt: string, players: { [team: string]: string[] }): Promise<string> {

    // Idea: Call model to get prediction based on players
    const system_prompt = `The user provides the current players for two teams, as well as a prompt on who to replace. 
      Please update the players for the teams based on the prompt.
      Return only and nothing but the players as two separate comma-separated lists with '|' separating the two teams. 

      Example Behavior:
      User: Lakers with players: Kareem Abdul-Jabbar, Elgin Baylor, Kobe Bryant, Wilt Chamberlain, Serbien Vlade Divac, 
      Bulls with players: Josh Giddey, Lonzo Ball, Matas Buzelis, Coby White, Jalen Smith. Prompt: Replace Kobe Bryant with Michael Jordan.
      
      Chatbot: kareem abdul-jabbar, elgin baylor, michael jordan, wilt chamberlain, serbien vlade divac | 
        josh giddey, lonzo ball, matas buzelis, coby white, jalen smith`;


    var userMessage = ``;

    Object.keys(players).forEach((team) => {
        userMessage += `${team} with players: ${players[team].join(", ")}`;
    });

    userMessage += ". Prompt:" + prompt;

    console.log("User message for updating players:", userMessage);

    const response = await callLLM(system_prompt, userMessage);

    return response;
}


// Define an interface for the team picker conversation context.
export interface TeamPickerContext {
    username: string;
    attitude: "casual_fan" | "serious_fan" | "coach" | "orginisation" | "no_type";
    history: Array<{ user: string; bot: string }>;
    state: "initial" | "awaitingConfirmation" | "awaitingPlayerList" | "PredictionProvided";
    digressionCount: 0;
    beforeDigression: string;
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
        console.log("Intent classified as:", intent);
    } catch (error) {
        // Fallback if intent classification fails.
        return "You are out of LLM API calls. Please try again later.";
    }

    if (intent === "player_list_provided") {
        context.state = "awaitingPlayerList";
    }

    if (intent === "chitchat") {
        context.digressionCount += 1;
        if (context.digressionCount === 1) {
            if (context.history.length === 0) {
                context.beforeDigression = "";
            } else {
                context.beforeDigression = context.history[context.history.length - 1].bot;
            }
        }

        var response = await chitchat(input);

        if (context.digressionCount === 3) {
            context.digressionCount = 0;
            response = response + "If you want to continue with the prediction, let me know: " + context.beforeDigression;
        }

        return response;
    }

    if (intent.includes("greeting")) {
        console.log("In Greeting node");

        if (!context.username) {
            var username = (await extractNameOfUser(input)).toLowerCase();
            if (username !== "error") { 
                context.username = username;
            }
        }

        var contextAttitude = await classifyUser(input);

        if (contextAttitude.toLowerCase() !== "no_type") {
            context.attitude = contextAttitude;
            return `Great to know that you are a ${context.attitude}! Provide the names of the teams or the players to get started.`;
        }

        return "Hello! How can I help you today?";
    }

    if (intent.includes("user_information_provided")) {
        if (!context.username) {
            var username = (await extractNameOfUser(input)).toLowerCase();
            if (username !== "error") {
                context.username = username;
            }
        }

        var contextAttitude = await classifyUser(input);

        if (contextAttitude.toLowerCase() !== "no_type") {
            context.attitude = contextAttitude;

            return `Great to know that you are a ${context.attitude}! Provide the names of the teams or the players to get started.`;
        }

        return "I could not classify your type.";
    }

    if (intent === "question_on_teams_or_players") {
        // Check if players are present in context.
        if (!context.players && context.teams) {
            context.players = await getPlayersFromTeams(context.teams.teamA, context.teams.teamB);
        }
        if (context.players && context.teams) {
            var response = `The players for ${context.teams?.teamA} are ${context.players[context.teams?.teamA].join(", ")} and for ${context.teams?.teamB} are ${context.players[context.teams?.teamB].join(", ")}.`;
        } else {
            context.state = "initial";
            var response = "I could not find any players.";
        }

        if (context.history.length > 0) {
            response = response + context.history[context.history.length - 1].bot;
        }
        return response;
    }

    if (intent === "question_on_single_player") {
        // Check if players are present in context.
        return await callLLM("You are an expert on basketball players, answer the following question", input);
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
            return prediction + "Do you want to predict using other players?";
        } else if (intent === "negative") {
            context.state = "awaitingPlayerList";
            return `Please provide the list of players for ${context.teams?.teamA} and ${context.teams?.teamB}.`;
        } else {
            return "Please answer with something like 'yes' or 'no'. Are you using the current players?";
        }
    } else if (context.state === "awaitingPlayerList") {
        // Extract player names from the user input.
        const stringWithPlayers = await extractPlayers(input);

        if (stringWithPlayers === "error") {
            return "Please provide the players for both teams.";
        }

        const listOfPlayers = stringWithPlayers.split("|").map(team => team.trim()); // Trim spaces

        console.log("List of all provided players:", listOfPlayers);

        // Check if players exist based on the extracted player names.
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

        return prediction + "Do you want to predict using other players?";
    } else if (context.state === "PredictionProvided") {
        // If affirmative, predict using other players.
        if (intent === "affirmative") {
            context.state = "awaitingPlayerList";
            return `Please provide the list of players for ${context.teams?.teamA} and ${context.teams?.teamB}.`;
        } else if (intent === "negative") {
            context.state = "initial";
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

                console.log("List of all provided players:", listOfPlayers);

                // Check if players exist based on the extracted player names.
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

                return prediction + "Do you want to predict using other players?";
            }
        } else {
            return "Please answer with something like 'yes' or 'no'. Do you want to predict using other players?";
        }

        return "What else do you want to know?";
    }

    return "Sorry, I didn't understand that. Could you please rephrase?";
}


var count = 0;

export async function wrapperHandleTeamPicker(userInput: string, context: TeamPickerContext): Promise<string> {
    console.log(context);

    var system_prompt = "";
    var response = await handleTeamPicker(userInput, context);

    console.log("Response from logic:", response);

    if (context.username) {
        count += 1;
        if (count % 5 === 1) {
            response = 'name: ' + context.username + ' + ' + response;
        }
    }
    if (context.attitude === "casual_fan") {
        if(response === "Hello! How can I help you today?"){
            return "Yooo, how can I help buddy?";
        }
        else if (response === "Great to know that you are a casual_fan! Provide the names of the teams or the players to get started.") {
            return "Yo, who we rockin' with? 🔥 Throw me some names and let's get this hype train rolling! 🚀";
        } else if (response === "Are you using the current players?") {
            return "Are you using the current ballers? 🏀🔥 We can switch it up if you wanna spice things up! 🔄😎";
        } else if (response === "Please provide the list of players for both teams.") {
            return "Drop the squad for both teams! 🏀🔥";
        }
        // Sets the system prompt to modify the response using the LLM
        var system_prompt = `Make the message engaging, enthusiastic, and informal. Use slang, emojis, and excitement to make the content feel like a conversation between passionate fans. Keep it lighthearted and fun. If the input is a yes/no question the reformulation should also be. IMPORTANT: Always include the prediction/analysis part of the message AND ALL PLAYER NAMES before reformulating the question part.
Example Behavior:
input: The Celtics will win due to their strong backcourt and depth with Tatum, Brown, Smart. Do you want to predict using other players?
output: The Celtics are gonna crush it with Tatum, Brown and Smart! Their backcourt is straight fire and they've got that deep bench! 🏀🔥 Wanna mix things up with some different players? Who you got in mind? 🔄

input: I predict the Nuggets with Jokic, Murray, Porter Jr will win. Do you want to predict using other players?
output: The Nuggets with the dream team of Jokic, Murray and Porter Jr are taking this W! 🏀🔥 Wanna switch up the squad? Who you got in mind? 🔄

input: The Lakers with James, Davis, Westbrook have a better chance because of their defense. Do you want to predict using other players?
output: Lakers' D with King James, AD and Westbrook is gonna lock it down! 🛡️🔥 Wanna try some different players? Who you got in mind? 🔄`;
    } else if (context.attitude === "serious_fan") {
        if(response === "Hello! How can I help you today?"){
            return "";
        }
        else if (response === "Great to know that you are a serious_fan! Provide the names of the teams or the players to get started.") {
            return "Let's establish a starting point. Which team or players would you like to analyze?";
        } else if (response === "Are you using the current players?") {
            return "The data reflects the latest roster updates. Can you confirm if you'd like to proceed with the current lineup?";
        }
        var system_prompt = `Make the message data-driven and responsible. Provide insights or predictions but emphasize that betting involves risk. Keep the tone professional but engaging, avoiding excessive emotional language. If the input is a yes/no question the reformulation should also be. IMPORTANT: Always include the prediction/analysis part of the message AND ALL PLAYER NAMES before reformulating the question part.

Example Behavior:
input: The Celtics will win due to their strong backcourt and depth with Tatum, Brown, Smart. Do you want to predict using other players?
output: Based on the data, the Celtics lineup of Tatum, Brown, and Smart shows strong potential with their backcourt performance and bench depth. Would you like to explore alternative player combinations?

input: I predict the Nuggets with Jokic, Murray, Porter Jr will win. Do you want to predict using other players?
output: The Nuggets' trio of Jokic, Murray, and Porter Jr demonstrate favorable odds based on current statistics. Would you like to analyze different player scenarios?

input: The Lakers with James, Davis, Westbrook have a better chance because of their defense. Do you want to predict using other players?
output: The Lakers' defensive metrics with James, Davis, and Westbrook suggest a competitive advantage. Would you like to evaluate different player configurations?`;
    } else if (context.attitude === "coach") {
        if (response === "Great to know that you are a coach! Provide the names of the teams or the players to get started.") {
            return "Let's establish a starting point. Which team or players would you like to analyze?";
        } else if (response === "Are you using the current players?") {
            return "We're operating with the most updated roster. Can you confirm if you'd like to proceed with the current lineup?";
        }
        var system_prompt = `Deliver insights in a strategic and analytical tone. Focus on game performance, key plays, and areas for improvement. Use professional, objective language suited for a coaching perspective. If the input is a yes/no question the reformulation should also be. IMPORTANT: Always include the prediction/analysis part of the message AND ALL PLAYER NAMES before reformulating the question part.

Example Behavior:
input: The Celtics will win due to their strong backcourt and depth with Tatum, Brown, Smart. Do you want to predict using other players?
output: The Celtics' backcourt execution with Tatum, Brown, and Smart, along with their bench rotation show strong potential for success. Would you like to explore alternative lineup configurations?

input: I predict the Nuggets with Jokic, Murray, Porter Jr will win. Do you want to predict using other players?
output: The Nuggets' current lineup featuring Jokic, Murray, and Porter Jr shows promising strategic advantages. Would you like to assess different player combinations?

input: The Lakers with James, Davis, Westbrook have a better chance because of their defense. Do you want to predict using other players?
output: The Lakers' defensive schemes and rotations with James, Davis, and Westbrook indicate a competitive edge. Would you like to evaluate different player matchups?`;
    
    } else if (context.attitude === "orginisation") {
        if (response === "Great to know that you are a orginisation! Provide the names of the teams or the players to get started.") {
            return "To proceed, please specify the team or players you'd like included in the analysis.";
        } else if (response === "Are you using the current players?") {
            return "This information is based on the latest roster updates. Let us know if you require adjustments.";
        }
        var system_prompt = `Ensure the message is professional, neutral, and liability-conscious. Avoid bias, speculation, or overly strong claims. Emphasize verified facts and, if relevant, include disclaimers on betting risks or financial implications. If the input is a yes/no question the reformulation should also be. IMPORTANT: Always include the prediction/analysis part of the message AND ALL PLAYER NAMES before reformulating the question part.

Example Behavior:
input: The Celtics will win due to their strong backcourt and depth with Tatum, Brown, Smart. Do you want to predict using other players?
output: The Celtics' roster composition with Tatum, Brown, and Smart shows favorable statistical indicators. Would you like to examine alternative player scenarios? (Note: All predictions are based on current data and should not be considered financial advice.)

input: I predict the Nuggets with Jokic, Murray, Porter Jr will win. Do you want to predict using other players?
output: The Nuggets' current lineup of Jokic, Murray, and Porter Jr presents positive performance metrics. Would you like to analyze different player configurations? (Note: All predictions are based on current data and should not be considered financial advice.)

input: The Lakers with James, Davis, Westbrook have a better chance because of their defense. Do you want to predict using other players?
output: The Lakers' defensive statistics with James, Davis, and Westbrook indicate potential advantages. Would you like to evaluate different player combinations? (Note: All predictions are based on current data and should not be considered financial advice.)`;
    }

    try {
        var new_response = await callLLM(system_prompt, response);
        return formatResponseText(new_response);
    } catch (error) {
        console.error('Error calling wrapperHandleTeamPicker:', error);
        return response;
    }
}


export async function getSuggestions(context: TeamPickerContext): Promise<string[]> {
    // state: "initial" | "awaitingConfirmation" | "awaitingPlayerList" | "PredictionProvided";
    const current_state = context.state;

    console.log("Fetching suggestions");

    if (current_state === "initial") {
        if (context.attitude === "no_type") {
            return [
                "I want to make a fantasy league team.",
                "I want to use predictions for betting.",
                "I'm a coach of a basketball team.",
                "I own a sports team."
            ];
        } else {
            return [
                "Predict the game outcome of Celtics vs. Nuggets.",
                "Will Warriors beat Spurs?",
                "How tall is LeBron James?"
            ];
        }
    }

    if (current_state === "awaitingConfirmation") {
        if (context.attitude === "casual_fan") {
            return [
                "Yes, let's go",
                "No way", 
                "Who are the current players?"
            ];
        }

        return [
            "Yes",
            "No"
        ];
    }

    if (current_state === "PredictionProvided") {
        if (context.players && context.teams) {
            const current_player_a = context.players[context.teams.teamA];
            const current_player_b = context.players[context.teams.teamB];

            return [
                `Replace ${current_player_a[0]} with Nikola Jokic`,
                `Replace ${current_player_b[2]} with Michael Jordan`,
                `Will Thunder beat the Lakers?`,
                `How tall is Kevin Durant?`
            ];
        }
    }

    return [
        "Predict the game outcome of Celtics vs. Nuggets.",
        "Who are the current players?",
        "How tall is LeBron James?",
        "Yes",
        "Replace Larry Bird with Michael Jordan"
    ];
}
