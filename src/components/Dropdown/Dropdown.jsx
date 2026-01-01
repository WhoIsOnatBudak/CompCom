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

  const selectedLabel = value ? value : "";

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
            {options.map((opt) => (
              <button
                type="button"
                key={opt}
                className={"ddItem " + (opt === value ? "active" : "")}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </button>
            ))}
            {options.length === 0 && (
              <div className="ddEmpty">No options</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
