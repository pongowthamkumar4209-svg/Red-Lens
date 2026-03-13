import React, { useEffect, useState } from "react";

const STEPS = [
  { msg: "FETCHING TODAY'S NEWS FROM RSS FEEDS…",       pct: 15 },
  { msg: "THE HINDU, INDIAN EXPRESS, AL JAZEERA…",      pct: 30 },
  { msg: "APPLYING MATERIALIST DIALECTIC TO HEADLINES…",pct: 45 },
  { msg: "EXTRACTING CLASS CONTRADICTIONS…",            pct: 55 },
  { msg: "IDENTIFYING RULING CLASS INTERESTS…",         pct: 65 },
  { msg: "SURFACING CASTE-CLASS INTERSECTIONS…",        pct: 75 },
  { msg: "CENTERING WORKER & PEASANT PERSPECTIVES…",    pct: 85 },
  { msg: "SAVING TO DATABASE…",                         pct: 95 },
];

const LoadingSpinner: React.FC = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const { msg, pct } = STEPS[step];

  return (
    <div className="loading-box">
      <div className="spinner" />
      <p className="loading-msg">{msg}</p>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:"0.65rem", color:"var(--mid)", marginTop:8, letterSpacing:"1px" }}>
        This may take 1–3 minutes — fetching & analysing all today's articles
      </p>
    </div>
  );
};

export default LoadingSpinner;
