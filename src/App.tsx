import { Routes, Route } from "react-router-dom";
import ChatBot from "./pages/game-predictor";

const App = () => {
  return (
    <div>
      <Routes> 
        <Route path="" element={<ChatBot />} />
      </Routes>
    </div>
  );
};

export default App;
