import { useMemo, useState } from "react";
import "./AnalyzePanel.css";

function now() {
  return performance.now();
}

function getUsedHeapMB() {
  const mem = performance.memory;
  if (!mem) return null;
  return mem.usedJSHeapSize / (1024 * 1024);
}

function runBenchmark(fn, iterations) {
  const memBefore = getUsedHeapMB();
  const t0 = now();
  for (let i = 0; i < iterations; i++) fn();
  const t1 = now();
  const memAfter = getUsedHeapMB();

  return {
    iterations,
    totalMs: t1 - t0,
    avgUs: ((t1 - t0) * 1000) / iterations,
    memDeltaMB: memBefore != null && memAfter != null ? (memAfter - memBefore) : null,
  };
}

export default function AnalyzePanel({ algorithm, bits, implementations }) {
  const [versionKey, setVersionKey] = useState("original");
  const [iterations, setIterations] = useState(20000);
  const [result, setResult] = useState(null);

  const disabled = !algorithm || !bits;

  const implKeys = useMemo(() => Object.keys(implementations || {}), [implementations]);

  function handleRun() {
    if (disabled) return;
    const encodeFn = implementations?.[versionKey];
    if (!encodeFn) return;

    const bench = runBenchmark(() => encodeFn(algorithm, bits), iterations);
    setResult(bench);
  }

  return (
    <div className="analyzeCard">
      <div className="analyzeTitle">Analyze / Benchmark</div>

      <div className="analyzeRow">
        <div className="lbl">Version</div>
        <select
          className="sel"
          value={versionKey}
          onChange={(e) => setVersionKey(e.target.value)}
        >
          {implKeys.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      <div className="analyzeRow">
        <div className="lbl">Iterations</div>
        <input
          className="num"
          type="number"
          min={1000}
          max={2000000}
          value={iterations}
          onChange={(e) => setIterations(Number(e.target.value || 0))}
        />
      </div>

      <button className="runBtn" onClick={handleRun} disabled={disabled}>
        Run benchmark
      </button>

      {disabled && <div className="hint">Benchmark için algorithm ve data seç.</div>}

      {result && (
        <div className="results">
          <div><b>Total:</b> {result.totalMs.toFixed(2)} ms</div>
          <div><b>Avg:</b> {result.avgUs.toFixed(3)} µs / iter</div>
          <div><b>Iterations:</b> {result.iterations}</div>
          <div>
            <b>Heap Δ:</b>{" "}
            {result.memDeltaMB == null ? "Not supported" : result.memDeltaMB.toFixed(3) + " MB"}
          </div>
        </div>
      )}
    </div>
  );
}
