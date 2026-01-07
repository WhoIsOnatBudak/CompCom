import { useMemo } from "react";
import { decode_dd } from "../../decoding/digital_to_digital_decoder";
import { demodulate_da } from "../../decoding/digital_to_analog_demodulator";
import "./ReceiverPanel.css";

export default function ReceiverPanel({ category, algorithm, data }) {
  const isD2D = category === "Digital → Digital";
  const isD2A = category === "Digital → Analog";

  const result = useMemo(() => {
    if (!algorithm || !data) return null;
    if (isD2D) return decode_dd(algorithm, data);
    if (isD2A) return demodulate_da(algorithm, data);
    return null;
  }, [isD2D, isD2A, algorithm, data]);

  if (!isD2D && !isD2A) {
    return (
      <div className="rxCard">
        <div className="rxTitle">Receiver</div>
        <div className="rxMuted">Bu kategori için receiver henüz eklenmedi.</div>
      </div>
    );
  }

  const title = isD2D ? "Receiver (Decoding)" : "Receiver (Demodulation)";

  if (!algorithm || !data) {
    return (
      <div className="rxCard">
        <div className="rxTitle">{title}</div>
        <div className="rxMuted">Algorithm ve data seç.</div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="rxCard">
      <div className="rxTitle">{title}</div>

      <div className="rxRow">
        <div className="rxLbl">Algorithm</div>
        <div className="rxVal">{algorithm}</div>
      </div>

      <div className="rxRow">
        <div className="rxLbl">Input</div>
        <div className="rxMono">{result.inputBits || "-"}</div>
      </div>

      <div className="rxRow">
        <div className="rxLbl">Recovered</div>
        <div className="rxMono">{result.recoveredBits || "-"}</div>
      </div>

      <div className={"rxStatus " + (result.ok ? "ok" : "bad")}>
        {result.ok ? "OK (matches)" : "Mismatch"}
      </div>

      <div className="rxNote">{result.note}</div>
    </div>
  );
}
