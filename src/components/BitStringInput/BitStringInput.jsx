import "./BitStringInput.css";

function onlyBits(v) {
  return v.replace(/[^01]/g, "");
}

export default function BitStringInput({ value, onChange, disabled }) {
  return (
    <div className="row">
      <div className="rowLabel">Data</div>
      <div>
        <input
          className="bitInput"
          placeholder={disabled ? "Select algorithm first" : "101010"}
          value={value}
          maxLength={32}
          onChange={(e) => onChange(onlyBits(e.target.value))}
          disabled={disabled}
        />
        <div className="bitMeta">Length: {value.length} / 32</div>
      </div>
    </div>
  );
}
