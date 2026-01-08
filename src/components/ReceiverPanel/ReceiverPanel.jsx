import { useMemo, useEffect } from "react";
import { getDigitalDecoder, getDigitalDemodulator } from "../../utils/algorithm_registry";
import { runBenchmark } from "../../utils/benchmark";
import "./ReceiverPanel.css";

export default function ReceiverPanel({ category, algorithm, data, implementation, onReportMetrics }) {
  const isD2D = category === "Digital → Digital";
  const isD2A = category === "Digital → Analog";

  const { result, metrics } = useMemo(() => {
    if (!algorithm || !data) return { result: null, metrics: null };

    let bench = null;
    let res = null;

    if (isD2D) {
      const decoder = getDigitalDecoder(implementation);
      bench = runBenchmark(() => decoder(algorithm, data));
      res = decoder(algorithm, data);
    } else if (isD2A) {
      const demodulator = getDigitalDemodulator(implementation);
      bench = runBenchmark(() => demodulator(algorithm, data));
      res = demodulator(algorithm, data);
    }

    return { result: res, metrics: bench };
  }, [isD2D, isD2A, algorithm, data, implementation]);

  useEffect(() => {
    if (metrics) onReportMetrics?.(metrics);
  }, [metrics, onReportMetrics]);

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
