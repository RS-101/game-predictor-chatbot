## 🧠 LLM Usage Summary

### **How LLMs are Called**
- The function `callLLM(system_prompt, prompt)` is the core utility used to communicate with the LLM (`Meta-Llama-3-70B-Instruct`) via the `https://api.awanllm.com/v1/chat/completions` endpoint.
- Prompts are structured as an array of messages (`system`, `user` roles).
- Parameters such as `temperature`, `top_p`, `top_k`, `repetition_penalty`, and `max_tokens` are configured.
- In addition we have wrappers of `callLLM` for specific usages. This include `classifyIntent`, `chitchat`, `extractNameOfUser`, `predictOnPlayers`, etc., all rely on `callLLM` to generate responses.

---

## 🧭 Intents & States Summary

### **Intents (Classified by `classifyIntent`)**
LLM or rule-based classification maps user inputs to one of:
- `greeting`
- `user_information_provided`
- `team_prediction`
- `player_list_provided`
- `affirmative`, `negative`
- `question_on_teams_or_players`
- `question_on_single_player`
- `player_update`
- `chitchat`
- `fallback`

### **User Types (`classifyUser`)**
Classifies users as:
- `casual_fan`, `serious_fan`, `coach`, `orginisation`, `no_type`

### **Conversation States (`TeamPickerContext.state`)**
Tracks dialogue progression:
- `initial`: Waiting for team names.
- `awaitingConfirmation`: Asking if user wants to use current players.
- `awaitingPlayerList`: Expecting custom player input.
- `PredictionProvided`: Prediction given; ready for follow-ups.

---

## 💡 Suggestion Logic Summary

### **Suggestions (`getSuggestions`)**
Context-aware suggestions are returned based on:
- Current `state`
- User `attitude` (e.g., casual fan gets slangier options)
- Available `teams` and `players`

Examples:
- In `initial`: Suggest user-type inputs or prediction questions.
- In `awaitingConfirmation`: Suggest yes/no or ask for current players.
- In `PredictionProvided`: Suggest player replacements or new matchups.

---

Let me know if you'd like a visual diagram of the flow too!