function sanitizeBits(bits) {
  return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

function bitsToInt(bitsArr, start, k) {
  let v = 0;
  for (let i = 0; i < k; i++) {
    v = (v << 1) | (bitsArr[start + i] ? 1 : 0);
  }
  return v;
}

function getSymbolValue(bitsArr, symbolStart, k, nBits) {
  let v = 0;
  for (let i = 0; i < k; i++) {
    const idx = symbolStart + i;
    const bit = idx < nBits ? bitsArr[idx] : 0; // eksik bitleri 0 varsay
    v = (v << 1) | (bit ? 1 : 0);
  }
  return v;
}

// 16-QAM Gray mapping (2 bit -> level)
function gray2ToLevel(b1, b0) {
  // Gray: 00->-3, 01->-1, 11->+1, 10->+3
  const key = (b1 << 1) | b0;
  if (key === 0) return -3;
  if (key === 1) return -1;
  if (key === 3) return 1;
  return 3; // 2
}

export function modulate_original(algorithm, bitsInput) {
  const bits = sanitizeBits(bitsInput);
  const b = bits.split("").map((x) => (x === "1" ? 1 : 0));
  const n = b.length;

  if (!algorithm || n === 0) return { bits, samplesPerBit: 0, samples: [] };

  const samplesPerBit = 80;

  // taşıyıcı: bit başına kaç cycle
  const baseCyclesPerBit = 2;

  const out = [];

  // Helper: bir bit aralığında sinüs üret
  function pushSine(cyclesPerBit, amp, phase) {
    const w = 2 * Math.PI * cyclesPerBit;
    for (let s = 0; s < samplesPerBit; s++) {
      const t = s / samplesPerBit; // 0..1
      out.push(amp * Math.sin(w * t + phase));
    }
  }

  if (algorithm === "ASK") {
    const a0 = 0.25;
    const a1 = 1.0;
    for (let i = 0; i < n; i++) {
      pushSine(baseCyclesPerBit, b[i] ? a1 : a0, 0);
    }
    return { bits, samplesPerBit, samples: out };
  }

  if (algorithm === "BFSK") {
    const f0 = baseCyclesPerBit;
    const f1 = baseCyclesPerBit * 2.0;
    for (let i = 0; i < n; i++) {
      pushSine(b[i] ? f1 : f0, 1.0, 0);
    }
    return { bits, samplesPerBit, samples: out };
  }

  // PSK (BPSK): 1 => phase 0, 0 => phase pi
  if (algorithm === "PSK" || algorithm === "BPSK") {
    for (let i = 0; i < n; i++) {
      const phase = b[i] ? 0 : Math.PI;
      pushSine(baseCyclesPerBit, 1.0, phase);
    }
    return { bits, samplesPerBit, samples: out };
  }

  // MFSK: burada 4-FSK (M=4) yapıyoruz (2 bit / sembol)
  // sembol içinde frekans sabit, o sembole ait bitlerin tamamında aynı frekans çizilir.
  if (algorithm === "MFSK") {
    const k = 2; // 2 bit / symbol => 4 frekans
    const delta = 1.0; // frekans adımı (cycle/bit)
    const base = baseCyclesPerBit; // merkez
    const freqs = [
      base - 1.5 * delta,
      base - 0.5 * delta,
      base + 0.5 * delta,
      base + 1.5 * delta,
    ];

    for (let i = 0; i < n; i++) {
      const symbolStart = i - (i % k);
      const sym = getSymbolValue(b, symbolStart, k, n); // 0..3
      const f = freqs[sym];
      pushSine(f, 1.0, 0);
    }
    return { bits, samplesPerBit, samples: out };
  }
  
    if (algorithm === "DPSK") {
    let phase = 0; // initial reference
    for (let i = 0; i < n; i++) {
      if (b[i] === 1) phase += Math.PI;

      const w = 2 * Math.PI * baseCyclesPerBit;
      for (let s = 0; s < samplesPerBit; s++) {
        const t = s / samplesPerBit;
        out.push(Math.sin(w * t + phase));
      }
    }
    return { bits, samplesPerBit, samples: out };
  }

  // QAM: burada 16-QAM (4 bit / sembol) yapıyoruz (Gray coded I/Q)
  // s(t) = I*cos + Q*sin. (tek dalga olarak çiziyoruz)
  if (algorithm === "QAM") {
    const k = 4; // 4 bit/symbol => 16-QAM
    const cycles = baseCyclesPerBit;

    // normalize için maksimum genlik ~ sqrt(3^2+3^2)=4.2426
    const norm = 1 / 4.242640687;

    for (let i = 0; i < n; i++) {
      const symbolStart = i - (i % k);

      const b0 = symbolStart < n ? b[symbolStart] : 0;
      const b1 = symbolStart + 1 < n ? b[symbolStart + 1] : 0;
      const b2 = symbolStart + 2 < n ? b[symbolStart + 2] : 0;
      const b3 = symbolStart + 3 < n ? b[symbolStart + 3] : 0;

      const I = gray2ToLevel(b0, b1);
      const Q = gray2ToLevel(b2, b3);

      const w = 2 * Math.PI * cycles;

      for (let s = 0; s < samplesPerBit; s++) {
        const t = s / samplesPerBit;
        const val = (I * Math.cos(w * t) + Q * Math.sin(w * t)) * norm;
        out.push(val);
      }
    }

    return { bits, samplesPerBit, samples: out };
  }

  return { bits, samplesPerBit: 0, samples: [] };
}
