import { useEffect, useMemo, useRef } from "react";
import { generateWave2T } from "../../analog/generateSignal";
import { adc_pcm, adc_delta } from "../../adc/adc_original";
import { reconstruct_pcm_from_bits, reconstruct_delta_from_bits } from "../../dac/reconstruct";

export default function A2DReconCanvas({ algorithm, analog }) {
  const canvasRef = useRef(null);

  const { sig, y, meta } = useMemo(() => {
    const s = generateWave2T((analog?.waveform) || "Sine");

    if (algorithm === "PCM") {
      const pcm = adc_pcm(s.samples, 4); // pcmBits fixed (we locked params)
      const yrec = reconstruct_pcm_from_bits(pcm.bits, 4, pcm.min, pcm.max, s.samples.length);
      return { sig: s, y: yrec, meta: { note: "PCM reconstruction (ZOH samples)" } };
    }

    if (algorithm === "Delta") {
      const step = 0.2; // deltaStep fixed (we locked params)
      const dm = adc_delta(s.samples, step);
      const yrec = reconstruct_delta_from_bits(dm.bits, step);
      return { sig: s, y: yrec, meta: { note: "Delta reconstruction (accumulator)" } };
    }

    return { sig: s, y: [], meta: { note: "Choose PCM or Delta" } };
  }, [algorithm, analog]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = Math.max(520, parent?.clientWidth || 520);
    const height = 220;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padX = 18, padTop = 24, padBottom = 16;
    const plotTop = padTop, plotBottom = height - padBottom;
    const midY = (plotTop + plotBottom) / 2;

    const grid = "#cbd5e7";
    const text = "#0f172a";
    const muted = "#64748b";
    const wave = "#2563eb";

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, midY);
    ctx.lineTo(width - padX, midY);
    ctx.stroke();

    ctx.fillStyle = text;
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "left";
    ctx.fillText("y(t) (reconstructed)", padX, 16);

    ctx.fillStyle = muted;
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText(`${algorithm || "-"} • ${meta.note} • 2T`, padX, height - 4);

    if (!algorithm || y.length === 0) {
      ctx.fillStyle = muted;
      ctx.fillText("Select PCM or Delta to see y(t).", padX, midY - 10);
      return;
    }

    let mn = y[0], mx = y[0];
    for (const v of y) { if (v < mn) mn = v; if (v > mx) mx = v; }
    const range = mx - mn || 1;

    const usableW = width - padX * 2;
    const usableH = plotBottom - plotTop;

    ctx.strokeStyle = wave;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < y.length; i++) {
      const x = padX + (i / (y.length - 1)) * usableW;
      const yy = plotTop + (1 - (y[i] - mn) / range) * usableH;
      if (i === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }

    ctx.stroke();
  }, [algorithm, sig, y, meta]);

  return <canvas ref={canvasRef} />;
}
