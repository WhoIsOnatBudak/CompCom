import { useEffect, useMemo, useState } from "react";
import Dropdown from "../Dropdown/Dropdown";
import BitStringInput from "../BitStringInput/BitStringInput";
import FieldCard from "../FieldCard/FieldCard";
import { algorithmsByCategoryLabel, categoryOptions } from "../../data/techniques";
import "./LeftPanel.css";
import AnalogWaveformSelect from "../AnalogWaveformSelect/AnalogWaveformSelect";


export default function LeftPanel({ onChange }) {
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


  const isA2D = category === "Analog → Digital";

  return (
    <div className="leftPanel">
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
        {isA2D ? (
        <AnalogWaveformSelect value={analog} onChange={setAnalog} />
      ) : (
        <BitStringInput value={data} onChange={setData} />
      )}

      </FieldCard>
    </div>
  );
}
