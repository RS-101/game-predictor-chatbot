# Game Predictor Chatbot

**A prototype chatbot designed for coaches and team managers to predict player matchups and assist with roster setup, developed using the Design Thinking framework.**

---

## 🚀 Features

- Predicts player matchups based on team composition
- Assists coaches with roster setup and planning
- Interactive chatbot interface
- Built using Vite, React, and TypeScript

---

## 🛠️ Tech Stack

- **React 19**
- **TypeScript**
- **Vite** for lightning-fast development

---

## 📦 Installation

Ensure you have **Node.js >=18** installed.

```bash
# Clone the repository
git clone https://github.com/RS-101/game-predictor-chatbot.git

# Navigate to the project folder
cd game-predictor-chatbot

# Install dependencies
npm install
```

---

## 🧪 Development

To start the development server:

```bash
npm run dev
```
---

## 📁 Project Structure

```
src/
├── pages/
│   ├── game-predictor.tsx         # Main UI component
│   ├── game-predictor-logic.ts    # Core chatbot logic
│   └── game-predictor.css         # Component styles
...
```
---

## 📄 License

This project is currently under a **private license** — feel free to reach out if you'd like to collaborate or learn more.

---

## ✨ Acknowledgements

Developed using the Design Thinking framework to ensure user-centric functionality and rapid prototyping.


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