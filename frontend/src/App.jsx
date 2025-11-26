import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import RequestAnalyzer from "./pages/RequestAnalyzer";
import { Header } from "./components/Header";
import CheckPhish from "./pages/CheckPhish";
import Intercepter from "./pages/Intercepter";

function App() {
  return (
    <Router>
      <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
        <Header />
        <div className="flex-1 min-h-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/intercepter" element={<Intercepter />} />
            <Route path="/request-analyzer" element={<RequestAnalyzer />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
