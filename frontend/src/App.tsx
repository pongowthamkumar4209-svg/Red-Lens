import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Header    from "./components/Header";
import Today     from "./pages/Today";
import WorldNews from "./pages/WorldNews";
import OtherNews from "./pages/OtherNews";
import Archive   from "./pages/Archive";
import Search    from "./pages/Search";
import Bookmarks from "./pages/Bookmarks";
import "./styles/global.css";
import "./styles/components.css";

const App: React.FC = () => (
  <BrowserRouter>
    <Header />
    <Routes>
      <Route path="/"          element={<Today />}     />
      <Route path="/world"     element={<WorldNews />} />
      <Route path="/other"     element={<OtherNews />} />
      <Route path="/archive"   element={<Archive />}   />
      <Route path="/search"    element={<Search />}    />
      <Route path="/bookmarks" element={<Bookmarks />} />
    </Routes>
    <footer>
      <div style={{ marginBottom: 6 }}>
        <span>RED LENS</span> — INDIA · TAMIL NADU · WORLD — DAILY POLITICAL ANALYSIS — <span>☭</span>
      </div>
      <div style={{ opacity: 0.5, fontSize: "0.58rem", letterSpacing: "2px" }}>
        BUILT BY <span style={{ color: "#c9a84c", opacity: 1 }}>PONGOWTHAM KUMAR</span>
      </div>
    </footer>
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "0.75rem",
          letterSpacing: "1px",
          background: "#1a0a08",
          color: "white",
          border: "1px solid #c0392b",
        },
      }}
    />
  </BrowserRouter>
);

export default App;
