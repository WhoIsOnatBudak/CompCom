import Accordion from "../Accordion/Accordion";
import { algorithmsByCategory } from "../../data/techniques";

export default function AlgorithmSelector({
  category,
  selected,
  onSelect,
}) {
  const list = category ? algorithmsByCategory[category] : [];

  return (
    <Accordion title="2) Algorithm" disabled={!category}>
      {list.map((a) => (
        <button
          key={a}
          className={`option ${selected === a ? "active" : ""}`}
          onClick={() => onSelect(a)}
        >
          {a}
        </button>
      ))}
    </Accordion>
  );
}
