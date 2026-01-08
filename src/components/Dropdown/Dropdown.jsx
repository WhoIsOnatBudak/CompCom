import { useEffect, useRef, useState } from "react";
import "./Dropdown.css";

export default function Dropdown({
  label,
  placeholder = "Select...",
  options = [],
  value,
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Handle both string options and {value, label} objects
  const getOptValue = (opt) => (typeof opt === 'object' ? opt.value : opt);
  const getOptLabel = (opt) => (typeof opt === 'object' ? opt.label : opt);

  // Find selected label based on current value string
  const selectedOption = options.find(opt => getOptValue(opt) === value);
  const selectedLabel = selectedOption ? getOptLabel(selectedOption) : (value || "");

  return (
    <div className="row" ref={rootRef}>
      <div className="rowLabel">{label}</div>

      <div className={"dd " + (disabled ? "disabled" : "")}>
        <button
          type="button"
          className="ddBtn"
          onClick={() => !disabled && setOpen((o) => !o)}
        >
          <span className={selectedLabel ? "" : "muted"}>
            {selectedLabel || placeholder}
          </span>
          <span className={"chev " + (open ? "up" : "")}>▾</span>
        </button>

        {open && !disabled && (
          <div className="ddMenu">
            {options.map((opt) => {
              const val = getOptValue(opt);
              const lbl = getOptLabel(opt);
              return (
                <button
                  type="button"
                  key={val}
                  className={"ddItem " + (val === value ? "active" : "")}
                  onClick={() => {
                    onChange(val);
                    setOpen(false);
                  }}
                >
                  {lbl}
                </button>
              );
            })}
            {options.length === 0 && (
              <div className="ddEmpty">No options</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
