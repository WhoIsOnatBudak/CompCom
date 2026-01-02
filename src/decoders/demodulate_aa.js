function movingAverage(x, win) {
  const w = Math.max(1, win | 0);
  const out = new Array(x.length).fill(0);
  let sum = 0;

  for (let i = 0; i < x.length; i++) {
    sum += x[i];
    if (i >= w) sum -= x[i - w];
    out[i] = sum / Math.min(w, i + 1);
  }
  return out;
}

function unwrapPhase(ph) {
  const out = new Array(ph.length);
  out[0] = ph[0];
  let offset = 0;

  for (let i = 1; i < ph.length; i++) {
    let dp = ph[i] - ph[i - 1];
    if (dp > Math.PI) offset -= 2 * Math.PI;
    else if (dp < -Math.PI) offset += 2 * Math.PI;
    out[i] = ph[i] + offset;
  }
  return out;
}

function iqDemod(y, fs, fc) {
  const I = new Array(y.length);
  const Q = new Array(y.length);

  for (let n = 0; n < y.length; n++) {
    const t = n / fs;
    const c = Math.cos(2 * Math.PI * fc * t);
    const s = Math.sin(2 * Math.PI * fc * t);

    // mix down
    I[n] = y[n] * c;
    Q[n] = -y[n] * s;
  }

  // LPF: window ~ (fs/fc) is a decent start
  const win = Math.max(5, Math.floor(fs / fc));
  const If = movingAverage(I, win);
  const Qf = movingAverage(Q, win);

  return { I: If, Q: Qf, win };
}

export function demodulate_aa(algorithm, y, fs) {
  // MUST match your modulate_aa.js constants
  const fc = 12;
  const ka = 0.7;
  const kf = 6;
  const kp = 1.2;

  if (!y || y.length === 0) return { mhat: [], note: "No signal" };

if (algorithm === "AM") {
  const mixed = new Array(y.length);
  for (let n = 0; n < y.length; n++) {
    const t = n / fs;
    mixed[n] = y[n] * Math.cos(2 * Math.PI * fc * t);
  }

  // LPF: cutoff around message bandwidth.
  // For square-ish message, keep more harmonics -> smaller window.
  const win = Math.max(7, Math.floor(fs / 25)); // fs=200 => ~8
  const base = movingAverage(mixed, win);

  // Remove DC using a much slower average (detrend)
  const dc = movingAverage(base, Math.max(30, Math.floor(fs / 2))); // ~100 samples
  let mhat = base.map((v, i) => v - dc[i]);

  // Scale (since cos*cos => 0.5 factor)
  mhat = mhat.map(v => (2 * v) / ka);

  // Optional: light smoothing only
  mhat = movingAverage(mhat, 5);

  // Normalize just for display (keeps square shape better than mean-subtract)
  let mx = 0;
  for (const v of mhat) mx = Math.max(mx, Math.abs(v));
  mx = mx || 1;
  mhat = mhat.map(v => v / mx);

  return { mhat, note: "AM demod: coherent mix + LPF + detrend + scale" };
}

if (algorithm === "PM") {
  const { I, Q } = iqDemod(y, fs, fc);

  const ph = new Array(y.length);
  for (let n = 0; n < y.length; n++) ph[n] = Math.atan2(Q[n], I[n]);
  const pu = unwrapPhase(ph);

  // phase difference removes slow drift
  const dphi = new Array(y.length).fill(0);
  for (let n = 1; n < y.length; n++) dphi[n] = pu[n] - pu[n - 1];
  dphi[0] = dphi[1] || 0;

  // integrate back (simple accumulator) to recover phase (up to constant)
  const perr = new Array(y.length).fill(0);
  for (let n = 1; n < y.length; n++) perr[n] = perr[n - 1] + dphi[n];

  // scale to m(t)
  let mhat = perr.map(v => v / kp);

  // remove mean + LPF
  let mean = 0;
  for (const v of mhat) mean += v;
  mean /= mhat.length;
  mhat = mhat.map(v => v - mean);

  const sm = movingAverage(mhat, Math.max(7, Math.floor(fs / (fc * 0.6))));
  return { mhat: sm, note: "PM demod: phase -> diff -> integrate -> /kp + LPF" };
}


  if (algorithm === "FM") {
    const { I, Q } = iqDemod(y, fs, fc);

    const ph = new Array(y.length);
    for (let n = 0; n < y.length; n++) ph[n] = Math.atan2(Q[n], I[n]);
    const pu = unwrapPhase(ph);

    const instFreq = new Array(y.length).fill(0);
    for (let n = 1; n < y.length; n++) {
        instFreq[n] = (pu[n] - pu[n - 1]) * fs / (2 * Math.PI);
    }
    instFreq[0] = instFreq[1] || 0;

    // mhat = (f - fc)/kf
    let mhat = instFreq.map(f => (f - fc) / kf);

    // remove mean (DC)
    let mean = 0;
    for (const v of mhat) mean += v;
    mean /= mhat.length;
    mhat = mhat.map(v => v - mean);

    const sm = movingAverage(mhat, Math.max(7, Math.floor(fs / (fc * 0.6))));
    return { mhat: sm, note: "FM demod: phase diff -> instFreq -> (f-fc)/kf + LPF" };
    }


  return { mhat: [], note: "Unsupported algorithm" };
}
