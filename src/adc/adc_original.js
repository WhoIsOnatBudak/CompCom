function toBitsUnsigned(x, bits) {
  let s = "";
  for (let i = bits - 1; i >= 0; i--) s += ((x >> i) & 1) ? "1" : "0";
  return s;
}

export function adc_pcm(samples, pcmBits) {
  const B = Math.min(8, Math.max(2, Number(pcmBits || 4)));

  let mn = samples[0], mx = samples[0];
  for (const x of samples) { if (x < mn) mn = x; if (x > mx) mx = x; }

  if (mx === mn) {
    const code = 0;
    const bits = toBitsUnsigned(code, B).repeat(samples.length);
    return { bits, codes: new Array(samples.length).fill(code), min: mn, max: mx, levels: 1 << B };
  }

  const L = 1 << B;
  const step = (mx - mn) / (L - 1);

  const codes = [];
  let bitsOut = "";

  for (const x of samples) {
    const q = Math.round((x - mn) / step);
    const code = Math.min(L - 1, Math.max(0, q));
    codes.push(code);
    bitsOut += toBitsUnsigned(code, B);
  }

  return { bits: bitsOut, codes, min: mn, max: mx, levels: L };
}

export function adc_delta(samples, stepSize) {
  const delta = Math.max(0.001, Number(stepSize || 0.2));

  let y = 0; // reconstructed accumulator
  let bitsOut = "";
  const rec = [];

  for (const x of samples) {
    if (x >= y) { bitsOut += "1"; y += delta; }
    else { bitsOut += "0"; y -= delta; }
    rec.push(y);
  }

  return { bits: bitsOut, reconstructed: rec, step: delta };
}
