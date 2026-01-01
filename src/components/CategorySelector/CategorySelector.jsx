import Accordion from "../Accordion/Accordion";
import { categories } from "../../data/techniques";

export default function CategorySelector({ selected, onSelect }) {
  return (
    <Accordion title="1) Category">
      {categories.map((c) => (
        <button
          key={c.key}
          className={`option ${selected === c.key ? "active" : ""}`}
          onClick={() => onSelect(c.key)}
        >
          {c.label}
        </button>
      ))}
    </Accordion>
  );
}
