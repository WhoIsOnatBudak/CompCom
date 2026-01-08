function sanitizeBits(bits) {
    return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

// Lookup table for bit to int conversion (2-4 bit için)
const BIT_TO_INT_LOOKUP = (() => {
    const table = {};
    for (let bits = 1; bits <= 4; bits++) {
        table[bits] = {};
        const max = 1 << bits;
        for (let i = 0; i < max; i++) {
            let key = "";
            for (let j = bits - 1; j >= 0; j--) {
                key += (i >> j) & 1;
            }
            table[bits][key] = i;
        }
    }
    return table;
})();

// Gray to level lookup (16-QAM için)
const GRAY_TO_LEVEL = [-3, -1, 3, 1]; // index: 00=0, 01=1, 10=2, 11=3

function getSymbolValue(bitsArr, symbolStart, k, n) {
    let v = 0;
    for (let i = 0; i < k; i++) {
        const idx = symbolStart + i;
        v = (v << 1) | (idx < n && bitsArr[idx] ? 1 : 0);
    }
    return v;
}

export function modulate_optimized(algorithm, bitsInput) {
    const bits = sanitizeBits(bitsInput);
    const n = bits.length;

    if (!algorithm || n === 0) return { bits, samplesPerBit: 0, samples: [] };

    // Bit array'i bir kez oluştur
    const b = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        b[i] = bits.charCodeAt(i) - 48; // '0'=48, '1'=49
    }

    const samplesPerBit = 80;
    const baseCyclesPerBit = 2;

    // Pre-allocate output array
    const totalSamples = n * samplesPerBit;
    const out = new Float32Array(totalSamples);

    // Ön hesaplamalar
    const TWO_PI = 2 * Math.PI;
    const invSamplesPerBit = 1 / samplesPerBit;

    // Helper: sinüs üretimi (inline edilebilir şekilde)
    let outIdx = 0;

    if (algorithm === "ASK") {
        const a0 = 0.25;
        const a1 = 1.0;
        const w = TWO_PI * baseCyclesPerBit;

        for (let i = 0; i < n; i++) {
            const amp = b[i] ? a1 : a0;
            for (let s = 0; s < samplesPerBit; s++) {
                out[outIdx++] = amp * Math.sin(w * s * invSamplesPerBit);
            }
        }
        return { bits, samplesPerBit, samples: out };
    }

    if (algorithm === "BFSK") {
        const f0 = baseCyclesPerBit;
        const f1 = baseCyclesPerBit * 2.0;
        const w0 = TWO_PI * f0;
        const w1 = TWO_PI * f1;

        for (let i = 0; i < n; i++) {
            const w = b[i] ? w1 : w0;
            for (let s = 0; s < samplesPerBit; s++) {
                out[outIdx++] = Math.sin(w * s * invSamplesPerBit);
            }
        }
        return { bits, samplesPerBit, samples: out };
    }

    if (algorithm === "PSK" || algorithm === "BPSK") {
        const w = TWO_PI * baseCyclesPerBit;
        const PI = Math.PI;

        for (let i = 0; i < n; i++) {
            const phase = b[i] ? 0 : PI;
            for (let s = 0; s < samplesPerBit; s++) {
                out[outIdx++] = Math.sin(w * s * invSamplesPerBit + phase);
            }
        }
        return { bits, samplesPerBit, samples: out };
    }

    if (algorithm === "MFSK") {
        const k = 2;
        const delta = 1.0;
        const base = baseCyclesPerBit;

        // Pre-compute frequencies and omegas
        const omegas = new Float32Array([
            TWO_PI * (base - 1.5 * delta),
            TWO_PI * (base - 0.5 * delta),
            TWO_PI * (base + 0.5 * delta),
            TWO_PI * (base + 1.5 * delta)
        ]);

        for (let i = 0; i < n; i++) {
            const symbolStart = i - (i % k);
            const sym = getSymbolValue(b, symbolStart, k, n);
            const w = omegas[sym];

            for (let s = 0; s < samplesPerBit; s++) {
                out[outIdx++] = Math.sin(w * s * invSamplesPerBit);
            }
        }
        return { bits, samplesPerBit, samples: out };
    }

    if (algorithm === "DPSK") {
        const w = TWO_PI * baseCyclesPerBit;
        let phase = 0;
        const PI = Math.PI;

        for (let i = 0; i < n; i++) {
            if (b[i] === 1) phase += PI;

            for (let s = 0; s < samplesPerBit; s++) {
                out[outIdx++] = Math.sin(w * s * invSamplesPerBit + phase);
            }
        }
        return { bits, samplesPerBit, samples: out };
    }

    if (algorithm === "QAM") {
        const k = 4;
        const w = TWO_PI * baseCyclesPerBit;
        const norm = 1 / 4.242640687;

        for (let i = 0; i < n; i++) {
            const symbolStart = i - (i % k);

            // Bitwise indexing with bounds check
            const idx0 = (symbolStart < n && b[symbolStart]) ? 1 : 0;
            const idx1 = (symbolStart + 1 < n && b[symbolStart + 1]) ? 1 : 0;
            const idx2 = (symbolStart + 2 < n && b[symbolStart + 2]) ? 1 : 0;
            const idx3 = (symbolStart + 3 < n && b[symbolStart + 3]) ? 1 : 0;

            const I = GRAY_TO_LEVEL[(idx0 << 1) | idx1];
            const Q = GRAY_TO_LEVEL[(idx2 << 1) | idx3];

            for (let s = 0; s < samplesPerBit; s++) {
                const t = s * invSamplesPerBit;
                const wt = w * t;
                out[outIdx++] = (I * Math.cos(wt) + Q * Math.sin(wt)) * norm;
            }
        }
        return { bits, samplesPerBit, samples: out };
    }

    return { bits, samplesPerBit: 0, samples: new Float32Array(0) };
}