import { useMemo, useEffect } from "react";
import { generateWave2T } from "../../analog/generateSignal";
import { getADC } from "../../utils/algorithm_registry";
import { runBenchmark } from "../../utils/benchmark";
import "./A2DOutput.css";

export default function A2DOutput({ algorithm, analog, implementation, onReportMetrics }) {
  const { sig, out, metrics } = useMemo(() => {
    const s = generateWave2T((analog?.waveform) || "Sine");
    const adcFuncs = getADC(implementation); // returns { pcm: fn, delta: fn }

    let bench = null;
    let res = null;

    if (algorithm === "PCM") {
      const pcmBits = (analog || {}).pcmBits;
      bench = runBenchmark(() => adcFuncs.pcm(s.samples, pcmBits));
      res = adcFuncs.pcm(s.samples, pcmBits);
    } else if (algorithm === "Delta") {
      const step = (analog || {}).deltaStep;
      bench = runBenchmark(() => adcFuncs.delta(s.samples, step));
      res = adcFuncs.delta(s.samples, step);
    }

    return {
      sig: s,
      out: res,
      metrics: bench
    };
  }, [algorithm, analog, implementation]);

  useEffect(() => {
    onReportMetrics?.(metrics);
  }, [metrics, onReportMetrics]);

  if (!algorithm) return <div className="a2dCard">Algorithm seç.</div>;
  if (!out) return <div className="a2dCard">Bu algorithm için output yok.</div>;

  return (
    <div className="a2dCard">
      <div className="a2dTitle">ADC Output</div>
      <div className="a2dRow"><div className="a2dLbl">Algorithm</div><div className="a2dVal">{algorithm}</div></div>
      <div className="a2dRow"><div className="a2dLbl">Signal</div><div className="a2dVal">sine, 2T (T=1/f)</div></div>

      {algorithm === "PCM" && (
        <>
          <div className="a2dRow"><div className="a2dLbl">PCM bits</div><div className="a2dVal">{(analog || {}).pcmBits}</div></div>
          <div className="a2dRow"><div className="a2dLbl">Levels</div><div className="a2dVal">{out.levels}</div></div>
        </>
      )}

      {algorithm === "Delta" && (
        <div className="a2dRow"><div className="a2dLbl">Delta step</div><div className="a2dVal">{out.step}</div></div>
      )}

      <div className="a2dBits">{out.bits.slice(0, 512)}{out.bits.length > 512 ? "…" : ""}</div>
      <div className="a2dHint">Not: Bitstream çok uzun olabileceği için ilk 512 bit gösteriliyor.</div>
    </div>
  );
}
