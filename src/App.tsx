import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import ChatBot from "./pages/team-picker-chat-bot";

const App = () => {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link> | <Link to="/chat-bot">Chat Bot</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat-bot" element={<ChatBot />} />
      </Routes>
    </div>
  );
};

export default App;
