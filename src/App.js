import { useState } from "react";
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

  return (
    <div className="layout">
      <div className="left">
        <LeftPanel onChange={setSel} />
      </div>

      <div className="right">
        <RightPanel selection={sel} />
      </div>

    </div>
  );
}
