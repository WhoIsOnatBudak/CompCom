import { generateWave2T } from "../analog/generateSignal";

function normalize(samples) {
  let mx = 0;
  for (const x of samples) mx = Math.max(mx, Math.abs(x));
  if (mx === 0) return samples.map(() => 0);
  return samples.map(x => x / mx);
}

export function modulate_aa(algorithm, waveform) {
  const sig = generateWave2T(waveform || "Sine");
  const m = normalize(sig.samples);

  const fs = sig.fs;
  const fc = 12;     // FIX carrier frequency (Hz)
  const ka = 0.7;    // FIX AM modulation index scale
  const kf = 6;      // FIX FM sensitivity

  const y = new Array(m.length);

  if (algorithm === "AM") {
    for (let n = 0; n < m.length; n++) {
      const t = n / fs;
      y[n] = (1 + ka * m[n]) * Math.cos(2 * Math.PI * fc * t);
    }
    return { x: sig.samples, y, fs, duration: sig.duration, note: `AM: y(t)=(1+ka*m(t))cos(2πfc t)` };
  }

    if (algorithm === "PM") {
    const kp = 1.2; // FIX phase sensitivity
    for (let n = 0; n < m.length; n++) {
      const t = n / fs;
      y[n] = Math.cos(2 * Math.PI * fc * t + kp * m[n]);
    }
    return { x: sig.samples, y, fs, duration: sig.duration, note: `PM: cos(2πfc t + kp·m(t))` };
  }

  if (algorithm === "FM") {
    let phase = 0;
    for (let n = 0; n < m.length; n++) {
      const t = n / fs;
      phase += (2 * Math.PI * kf * m[n]) / fs; // discrete integral
      y[n] = Math.cos(2 * Math.PI * fc * t + phase);
    }
    return { x: sig.samples, y, fs, duration: sig.duration, note: `FM: cos(2πfc t + kf∫m(t)dt)` };
  }

  return { x: sig.samples, y: [], fs, duration: sig.duration, note: "Choose AM , FM or PM." };
}
