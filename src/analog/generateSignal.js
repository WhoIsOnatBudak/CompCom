function sgn(x) {
  return x >= 0 ? 1 : -1;
}

export function generateWave2T(waveform) {
  const f = 2;          // FIX frequency (Hz))
  const A = 1;          // FIX amplitude
  const offset = 0;     // FIX offset
  const fs = 200;       // FIX sample rate (Hz)

  const T = 1 / f;
  const duration = 2 * T;              // FIX 16T
  const N = Math.max(1, Math.floor(duration * fs));

  const samples = new Array(N);

  for (let n = 0; n < N; n++) {
    const t = n / fs;
    const w = 2 * Math.PI * f * t;

    let x = 0;

    if (waveform === "Square") {
      x = A * sgn(Math.sin(w));
    } else if (waveform === "Triangle") {
      // triangle using arcsin(sin)
      x = (2 * A / Math.PI) * Math.asin(Math.sin(w));
    } else if (waveform === "Sawtooth") {
      // sawtooth in [-A, A]
      const frac = (t * f) - Math.floor(t * f); // 0..1
      x = A * (2 * frac - 1);
    } else {
      // default Sine
      x = A * Math.sin(w);
    }

    samples[n] = offset + x;
  }

  return { samples, fs, duration, T, f, waveform: waveform || "Sine" };
}
