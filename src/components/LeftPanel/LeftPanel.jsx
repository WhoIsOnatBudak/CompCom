import { useEffect, useMemo, useState } from "react";
import Dropdown from "../Dropdown/Dropdown";
import BitStringInput from "../BitStringInput/BitStringInput";
import FieldCard from "../FieldCard/FieldCard";
import ImplementationSelector from "../ImplementationSelector/ImplementationSelector";
import MetricDisplay from "../MetricDisplay/MetricDisplay";
import { algorithmsByCategoryLabel, categoryOptions } from "../../data/techniques";
import "./LeftPanel.css";
import AnalogWaveformSelect from "../AnalogWaveformSelect/AnalogWaveformSelect";


export default function LeftPanel({ onChange, implementation, onImplChange, metrics }) {
  const [category, setCategory] = useState("");
  const [algorithm, setAlgorithm] = useState("");
  const [data, setData] = useState("");

  const [analog, setAnalog] = useState({ waveform: "Sine" });

  const algOptions = useMemo(() => {
    if (!category) return [];
    return algorithmsByCategoryLabel[category] || [];
  }, [category]);

  useEffect(() => {
    onChange?.({ category, algorithm, data, analog });
  }, [category, algorithm, data, analog, onChange]);

  const isAnalogInput = category === "Analog → Digital" || category === "Analog → Analog";

  return (
    <div className="leftPanel">
      <ImplementationSelector value={implementation} onChange={onImplChange} />

      <FieldCard>
        <Dropdown
          label="Category"
          placeholder="Choose category"
          options={categoryOptions}
          value={category}
          onChange={(v) => {
            setCategory(v);
            setAlgorithm("");
            setData("");
          }}
        />
      </FieldCard>

      <FieldCard>
        <Dropdown
          label="Algorithm"
          placeholder="Choose algorithm"
          options={algOptions}
          value={algorithm}
          onChange={(v) => {
            setAlgorithm(v);
            setData("");
          }}
          disabled={!category}
        />
      </FieldCard>

      <FieldCard>
        {isAnalogInput ? (
          <AnalogWaveformSelect value={analog} onChange={setAnalog} />
        ) : (
          <BitStringInput value={data} onChange={setData} />
        )}

      </FieldCard>

      <MetricDisplay metrics={metrics} />
    </div>
  );
}
