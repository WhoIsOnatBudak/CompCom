import { modulate_original } from "../modulators/modulate_original";

function sanitizeBits(bits) {
  return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

function clampNearestLevel(v) {
  const levels = [-3, -1, 1, 3];
  let best = levels[0];
  let bestD = Math.abs(v - best);
  for (let i = 1; i < levels.length; i++) {
    const d = Math.abs(v - levels[i]);
    if (d < bestD) {
      bestD = d;
      best = levels[i];
    }
  }
  return best;
}

function levelToGray2Bits(level) {
  // inverse of: 00->-3, 01->-1, 11->+1, 10->+3
  if (level === -3) return [0, 0];
  if (level === -1) return [0, 1];
  if (level === 1) return [1, 1];
  return [1, 0]; // +3
}

function corrWithSin(samples, cyclesPerBit) {
  const N = samples.length;
  const w = 2 * Math.PI * cyclesPerBit;
  let s = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    s += samples[i] * Math.sin(w * t);
  }
  return s;
}

function corrWithCos(samples, cyclesPerBit) {
  const N = samples.length;
  const w = 2 * Math.PI * cyclesPerBit;
  let s = 0;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    s += samples[i] * Math.cos(w * t);
  }
  return s;
}

function energy(samples) {
  let e = 0;
  for (const x of samples) e += x * x;
  return e / Math.max(1, samples.length);
}

function sliceBit(samples, spb, bitIndex) {
  const a = bitIndex * spb;
  const b = a + spb;
  return samples.slice(a, b);
}

function demod_ask(bitsLen, samples, spb) {
  const energies = [];
  for (let i = 0; i < bitsLen; i++) energies.push(energy(sliceBit(samples, spb, i)));

  let mn = energies[0], mx = energies[0];
  for (const e of energies) {
    if (e < mn) mn = e;
    if (e > mx) mx = e;
  }
  const thr = (mn + mx) / 2;

  let out = "";
  for (let i = 0; i < bitsLen; i++) out += energies[i] > thr ? "1" : "0";
  return { recoveredBits: out, note: "ASK: energy threshold decision." };
}

function demod_bfsk(bitsLen, samples, spb) {
  const f0 = 2;
  const f1 = 4;

  let out = "";
  for (let i = 0; i < bitsLen; i++) {
    const win = sliceBit(samples, spb, i);
    const c0 = Math.abs(corrWithSin(win, f0));
    const c1 = Math.abs(corrWithSin(win, f1));
    out += c1 > c0 ? "1" : "0";
  }
  return { recoveredBits: out, note: "BFSK: max correlation among f0/f1." };
}

function demod_mfsk(bitsLen, samples, spb) {
  // Our MFSK implementation is 4-FSK with 2 bits/symbol
  const k = 2;
  const base = 2;
  const delta = 1.0;
  const freqs = [
    base - 1.5 * delta,
    base - 0.5 * delta,
    base + 0.5 * delta,
    base + 1.5 * delta,
  ];

  const nSymbols = Math.ceil(bitsLen / k);
  const symVal = new Array(nSymbols).fill(0);

  for (let s = 0; s < nSymbols; s++) {
    const i0 = s * k; // bit index
    const win = sliceBit(samples, spb, i0); // take first bit window of symbol (wave repeats)
    let best = 0;
    let bestC = -1;

    for (let m = 0; m < 4; m++) {
      const c = Math.abs(corrWithSin(win, freqs[m]));
      if (c > bestC) {
        bestC = c;
        best = m;
      }
    }
    symVal[s] = best; // 0..3
  }

  let out = "";
  for (let i = 0; i < bitsLen; i++) {
    const s = Math.floor(i / k);
    const v = symVal[s];
    const b1 = (v >> 1) & 1;
    const b0 = v & 1;
    out += i % 2 === 0 ? String(b1) : String(b0);
  }

  return { recoveredBits: out, note: "MFSK(4-FSK): max correlation among 4 freqs, expanded to 2 bits/symbol." };
}

function demod_bpsk(bitsLen, samples, spb) {
  const fc = 2;
  let out = "";
  for (let i = 0; i < bitsLen; i++) {
    const win = sliceBit(samples, spb, i);
    const c = corrWithSin(win, fc);
    out += c >= 0 ? "1" : "0";
  }
  return { recoveredBits: out, note: "PSK(BPSK): sign of correlation with reference carrier." };
}

function demod_dpsk(bitsLen, samples, spb) {
  const fc = 2;

  // reference window: sin(2π f t) for first-bit differential compare
  const ref = [];
  for (let i = 0; i < spb; i++) {
    const t = i / spb;
    ref.push(Math.sin(2 * Math.PI * fc * t));
  }

  function dot(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  let out = "";
  let prev = ref;

  for (let i = 0; i < bitsLen; i++) {
    const cur = sliceBit(samples, spb, i);
    const d = dot(cur, prev);
    out += d < 0 ? "1" : "0"; // negative correlation => phase flip => bit 1
    prev = cur;
  }

  return { recoveredBits: out, note: "DPSK: differential detection via correlation between consecutive bit windows." };
}

function demod_qam(bitsLen, samples, spb) {
  // Our QAM is 16-QAM with 4 bits/symbol, same symbol repeats each bit in that symbol.
  const k = 4;
  const cycles = 2;
  const nSymbols = Math.ceil(bitsLen / k);

  let outBits = [];

  // precompute cos/sin for 1 bit-window
  const cosRef = [];
  const sinRef = [];
  for (let i = 0; i < spb; i++) {
    const t = i / spb;
    cosRef.push(Math.cos(2 * Math.PI * cycles * t));
    sinRef.push(Math.sin(2 * Math.PI * cycles * t));
  }
  const cosPow = cosRef.reduce((a, x) => a + x * x, 0) || 1;
  const sinPow = sinRef.reduce((a, x) => a + x * x, 0) || 1;

  for (let s = 0; s < nSymbols; s++) {
    const i0 = s * k; // first bit index of symbol
    const win = sliceBit(samples, spb, i0); // use first bit window (repeats)

    // estimate I,Q up to scale; then quantize to nearest of {-3,-1,1,3}
    let Ic = 0, Qc = 0;
    for (let i = 0; i < spb; i++) {
      Ic += win[i] * cosRef[i];
      Qc += win[i] * sinRef[i];
    }
    // scale factors: original was (I cos + Q sin) * norm, norm = 1/4.2426
    const normInv = 4.242640687;
    const Iest = (Ic / cosPow) * normInv;
    const Qest = (Qc / sinPow) * normInv;

    const Iq = clampNearestLevel(Iest);
    const Qq = clampNearestLevel(Qest);

    const [iB1, iB0] = levelToGray2Bits(Iq);
    const [qB1, qB0] = levelToGray2Bits(Qq);

    // symbol bits order must match modulator usage:
    // we used: b0,b1 -> I ; b2,b3 -> Q (in modulator file)
    outBits.push(iB1, iB0, qB1, qB0);
  }

  // truncate to original bitsLen
  const recovered = outBits.slice(0, bitsLen).map(String).join("");
  return { recoveredBits: recovered, note: "16-QAM: estimate I/Q via correlation, nearest constellation (Gray)." };
}

export function demodulate_da(algorithm, bitsInput) {
  const bits = sanitizeBits(bitsInput);
  const bitsLen = bits.length;

  const mod = modulate_original(algorithm, bits);
  const samples = mod.samples || [];
  const spb = mod.samplesPerBit || 0;

  if (!algorithm) return { inputBits: bits, recoveredBits: "", ok: false, note: "No algorithm selected." };
  if (bitsLen === 0) return { inputBits: bits, recoveredBits: "", ok: true, note: "Empty input." };
  if (samples.length === 0 || spb === 0) {
    return { inputBits: bits, recoveredBits: "", ok: false, note: "No samples (modulation missing?)." };
  }

  let res = null;

  if (algorithm === "ASK") res = demod_ask(bitsLen, samples, spb);
  else if (algorithm === "BFSK") res = demod_bfsk(bitsLen, samples, spb);
  else if (algorithm === "MFSK") res = demod_mfsk(bitsLen, samples, spb);
  else if (algorithm === "PSK" || algorithm === "BPSK") res = demod_bpsk(bitsLen, samples, spb);
  else if (algorithm === "DPSK") res = demod_dpsk(bitsLen, samples, spb);
  else if (algorithm === "QAM") res = demod_qam(bitsLen, samples, spb);
  else {
    return { inputBits: bits, recoveredBits: "", ok: false, note: "Demodulation not implemented for this algorithm." };
  }

  const recoveredBits = res.recoveredBits;
  return {
    inputBits: bits,
    recoveredBits,
    ok: recoveredBits === bits,
    note: res.note + " (Ideal sync/channel)",
  };
}
