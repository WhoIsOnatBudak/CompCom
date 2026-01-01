import { useMemo } from "react";
import { generateWave16T } from "../../analog/generateSignal";
import { adc_pcm, adc_delta } from "../../adc/adc_original";
import "./A2DOutput.css";

export default function A2DOutput({ algorithm, analog }) {
  const { sig, out } = useMemo(() => {
    const s = generateWave16T((analog?.waveform) || "Sine");
    if (algorithm === "PCM") {
      return { sig: s, out: adc_pcm(s.samples, (analog || {}).pcmBits) };
    }
    if (algorithm === "Delta") {
      return { sig: s, out: adc_delta(s.samples, (analog || {}).deltaStep) };
    }
    return { sig: s, out: null };
  }, [algorithm, analog]);

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
