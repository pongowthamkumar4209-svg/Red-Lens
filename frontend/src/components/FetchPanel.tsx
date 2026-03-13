import React, { useState } from "react";
import type { Region, Topic, Depth } from "../types";
import { REGION_OPTIONS, TOPIC_OPTIONS, DEPTH_OPTIONS } from "../types";

interface Props {
  onFetch: (region: Region, topic: Topic, depth: Depth, forceRefresh: boolean) => void;
  loading: boolean;
  fromCache?: boolean;
}

const FetchPanel: React.FC<Props> = ({ onFetch, loading, fromCache }) => {
  const [region, setRegion] = useState<Region>("both");
  const [topic, setTopic] = useState<Topic>("all");
  const [depth, setDepth] = useState<Depth>("standard");

  const handleFetch = (force = false) => {
    onFetch(region, topic, depth, force);
  };

  return (
    <div className="fetch-panel">
      <h2 className="fetch-panel-title">
        <span>☭</span> Collect Today's News
      </h2>

      <div className="fetch-row">
        <div className="fetch-group">
          <label className="fetch-label">Region</label>
          <select value={region} onChange={(e) => setRegion(e.target.value as Region)}>
            {REGION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="fetch-group">
          <label className="fetch-label">Topic</label>
          <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
            {TOPIC_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="fetch-group">
          <label className="fetch-label">Analysis Depth</label>
          <select value={depth} onChange={(e) => setDepth(e.target.value as Depth)}>
            {DEPTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="fetch-btn-group">
          <button
            className="btn btn-primary"
            onClick={() => handleFetch(false)}
            disabled={loading}
          >
            {loading ? "Fetching…" : "Fetch & Analyse"}
          </button>
          {fromCache !== undefined && (
            <button
              className="btn btn-secondary"
              onClick={() => handleFetch(true)}
              disabled={loading}
              title="Force re-fetch from Claude even if today's session exists"
            >
              ↺ Refresh
            </button>
          )}
        </div>
      </div>

      {fromCache && (
        <p className="cache-notice">Showing cached results for today. Click Refresh to re-fetch.</p>
      )}
    </div>
  );
};

export default FetchPanel;
