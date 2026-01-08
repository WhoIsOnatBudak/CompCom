import "./ImplementationSelector.css";
import Dropdown from "../Dropdown/Dropdown";

export default function ImplementationSelector({ value, onChange }) {
    const options = [
        { value: "user", label: "User Code" },
        { value: "ai1", label: "Claude Optimized" },
        { value: "ai2", label: "Gemini Optimized" },
    ];

    return (
        <div className="implSelector">
            <Dropdown
                label="Process Engine"
                placeholder="Select Engine"
                options={options}
                value={value}
                onChange={onChange}
            />
        </div>
    );
}
