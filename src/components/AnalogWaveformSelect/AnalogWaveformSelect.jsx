import Dropdown from "../Dropdown/Dropdown";
import "./AnalogWaveformSelect.css";

const waveformOptions = ["Sine", "Square", "Triangle", "Sawtooth"];

export default function AnalogWaveformSelect({ value, onChange }) {
  return (
    <div className="awsCard">
      <Dropdown
        label="Analog waveform (fixed 2T)"
        placeholder="Choose waveform"
        options={waveformOptions}
        value={value?.waveform || "Sine"}
        onChange={(v) => onChange?.({ waveform: v })}
      />
      <div className="awsHint">
        Signal length is fixed to 2T. Parameters are fixed (no edits).
      </div>
    </div>
  );
}
