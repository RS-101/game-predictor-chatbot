import React, { useState, useRef, useEffect } from 'react';
import './game-predictor.css';
import { wrapperHandleTeamPicker, TeamPickerContext, getSuggestions } from './game-predictor-logic.ts';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
}

const teamContext: TeamPickerContext = {
  username: "",
  attitude: "no_type",
  digressionCount: 0,
  beforeDigression: "",
  history: [],
  state: "initial",
};

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      text: "Welcome to the Game Predictor Chat Bot. Please provide your name and profession for a personalized experience.",
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent scrolling on the body when this component mounts
    document.body.style.overflow = 'hidden';
    
    const fetchSuggestions = async () => {
      const result = await getSuggestions(teamContext);
      setSuggestions(result);
    };
    fetchSuggestions();
    
    // Restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [teamContext.history]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Use the team picker function instead of calling the OpenAI API
  const callTeamPicker = async (userMessage: string) => {
    try {
      const formattedResponse = await wrapperHandleTeamPicker(userMessage, teamContext);
      return formattedResponse;
    } catch (error) {
      console.error('Error calling wrapperHandleTeamPicker:', error);
      return "I'm sorry, I encountered an error processing your request. Please try again later.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Get response using the team picker logic
      const responseText = await callTeamPicker(userMessage.text);

      // Add bot response
      const botMessage: Message = {
        id: (Date.now() + 100).toString(),
        type: 'bot',
        text: responseText || "I'm sorry, I couldn't generate a response.",
      };
      // Add the conversation to the team context history
      teamContext.history.push({ user: userMessage.text, bot: botMessage.text });

      // ...new code: update suggestions when response is returned...
      const updatedSuggestions = await getSuggestions(teamContext);

      setMessages(prev => [...prev, botMessage]);
      setSuggestions(updatedSuggestions);

    } catch (error) {
      console.error('Error in handleSubmit:', error);

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 100).toString(),
        type: 'bot',
        text: "I'm sorry, I encountered an error. Please try again later.",
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    // And submit the form immediately
    handleSubmit({ preventDefault: () => { } } as React.FormEvent);
  };


  return (
    <div className="standalone-page">
      <div className="top-bar">
        <h1 className="page-title">Basketball Game Predictor</h1>
      </div>
      
      <div className="chat-container">
        <div className="messages-container">
          {messages.map(message => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                <div
                  className="message-text"
                  dangerouslySetInnerHTML={{ __html: message.text }}
                />
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="message bot typing">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="suggestions-container">
          <h4>Suggestions</h4>
          <div className="suggestions">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="suggestion"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <form className="input-container" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter your query..."
            value={input}
            onChange={handleInputChange}
            disabled={isTyping}
          />
          <button type="submit" disabled={isTyping || !input.trim()}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="send-icon">
              <path d="M22 2L11 13"></path>
              <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;
