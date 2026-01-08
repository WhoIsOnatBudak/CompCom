import { useState, useCallback } from "react";
import LeftPanel from "./components/LeftPanel/LeftPanel";
import RightPanel from "./components/RightPanel/RightPanel";
import "./App.css";

export default function App() {
  const [sel, setSel] = useState({
    category: "",
    algorithm: "",
    data: "",
    analog: {
      f: 2,
      amplitude: 1,
      offset: 0,
      fs: 200,      // sample rate
      pcmBits: 4,   // PCM quantization bits
      deltaStep: 0.2
    }
  });

  const [impl, setImpl] = useState("user"); // user, ai1, ai2
  const [metrics, setMetrics] = useState({ avgTime: 0, calls: 0 });

  const handleMetrics = useCallback((m) => {
    // Avoid rapid re-renders if metrics are similar? 
    // For now direct update is fine as calculations are triggered by user input events
    setMetrics(m);
  }, []);

  return (
    <div className="layout">
      <div className="left">
        <LeftPanel
          onChange={setSel}
          implementation={impl}
          onImplChange={setImpl}
          metrics={metrics}
        />
      </div>

      <div className="right">
        <RightPanel
          selection={sel}
          implementation={impl}
          onReportMetrics={handleMetrics}
        />
      </div>

    </div>
  );
}
