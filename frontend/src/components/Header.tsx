import React from "react";
import { NavLink } from "react-router-dom";
import { format } from "date-fns";

const Header: React.FC = () => {
  const today = format(new Date(), "EEEE, d MMMM yyyy").toUpperCase();

  return (
    <header className="masthead">
      <div className="masthead-top">
        <span className="hammer">☭</span>

        <div className="masthead-center">
          <h1 className="masthead-title">Red Lens</h1>
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.6rem",
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            opacity: 0.55,
            marginTop: 5,
            color: "white",
          }}>
            Built by <span style={{ color: "#c9a84c", opacity: 1, fontWeight: 600 }}>Pongowtham Kumar</span>
          </p>
        </div>

        <span className="hammer" style={{ transform: "scaleX(-1)" }}>☭</span>
      </div>

      <div className="masthead-datebar">
        <span>{today}</span>
        <span>Workers of the World, Unite!</span>
        <span>மக்களே சக்தி</span>
      </div>

      <nav className="main-nav">
        <NavLink to="/"      end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>▸ India / TN</NavLink>
        <NavLink to="/world"     className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>▸ World News</NavLink>
        <NavLink to="/other"     className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>▸ Sports & More</NavLink>
        <NavLink to="/archive"   className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>▸ Archive</NavLink>
        <NavLink to="/search"    className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>▸ Search</NavLink>
        <NavLink to="/bookmarks" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>▸ Bookmarks</NavLink>
      </nav>
    </header>
  );
};

export default Header;
