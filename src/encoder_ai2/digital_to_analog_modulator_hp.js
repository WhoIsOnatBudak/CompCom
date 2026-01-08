function sanitizeBits(bits) {
    return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

export function modulate_hp(algorithm, bitsInput) {
    const bitsStr = sanitizeBits(bitsInput);
    const n = bitsStr.length;
    const spb = 80; // samplesPerBit
    if (!algorithm || n === 0) return { bits: bitsStr, samplesPerBit: 0, samples: new Float32Array(0) };

    const out = new Float32Array(n * spb);
    const TWO_PI = 2 * Math.PI;
    const baseCycles = 2;

    // --- Optimization: Pre-compute a single-cycle Sine/Cosine LUT ---
    // This removes Math.sin() from the inner loops entirely.
    const sineTable = new Float32Array(spb);
    const cosTable = new Float32Array(spb);
    for (let s = 0; s < spb; s++) {
        const angle = TWO_PI * baseCycles * (s / spb);
        sineTable[s] = Math.sin(angle);
        cosTable[s] = Math.cos(angle);
    }

    if (algorithm === "ASK") {
        for (let i = 0; i < n; i++) {
            const amp = bitsStr[i] === "1" ? 1.0 : 0.25;
            const off = i * spb;
            for (let s = 0; s < spb; s++) out[off + s] = amp * sineTable[s];
        }
    }

    else if (algorithm === "BFSK") {
        // BFSK needs a different frequency, so we use a simple multiplier
        for (let i = 0; i < n; i++) {
            const isOne = bitsStr[i] === "1";
            const off = i * spb;
            for (let s = 0; s < spb; s++) {
                // If "1", use double frequency (sineTable skips samples or we use sin)
                out[off + s] = isOne ? Math.sin(TWO_PI * (baseCycles * 2) * (s / spb)) : sineTable[s];
            }
        }
    }

    else if (algorithm === "BPSK" || algorithm === "PSK") {
        for (let i = 0; i < n; i++) {
            const multiplier = bitsStr[i] === "1" ? 1 : -1; // phase shift PI is just negation
            const off = i * spb;
            for (let s = 0; s < spb; s++) out[off + s] = multiplier * sineTable[s];
        }
    }

    else if (algorithm === "DPSK") {
        let phaseMul = 1;
        for (let i = 0; i < n; i++) {
            if (bitsStr[i] === "1") phaseMul *= -1; // Differential flip
            const off = i * spb;
            for (let s = 0; s < spb; s++) out[off + s] = phaseMul * sineTable[s];
        }
    }

    else if (algorithm === "MFSK") {
        const freqs = [baseCycles - 1.5, baseCycles - 0.5, baseCycles + 0.5, baseCycles + 1.5];
        for (let i = 0; i < n; i += 2) {
            const b0 = bitsStr[i] === "1" ? 1 : 0;
            const b1 = (i + 1 < n && bitsStr[i + 1] === "1") ? 1 : 0;
            const f = freqs[(b0 << 1) | b1];

            // Process both bit-slots for this 2-bit symbol
            for (let symBit = 0; symBit < 2 && (i + symBit) < n; symBit++) {
                const off = (i + symBit) * spb;
                for (let s = 0; s < spb; s++) {
                    out[off + s] = Math.sin(TWO_PI * f * (s / spb));
                }
            }
        }
    }

    else if (algorithm === "QAM") {
        const norm = 1 / 4.242640687;
        const grayMap = [-3, -1, 3, 1];
        for (let i = 0; i < n; i += 4) {
            const b = (idx) => (idx < n && bitsStr[idx] === "1" ? 1 : 0);
            const I = grayMap[(b(i) << 1) | b(i + 1)];
            const Q = grayMap[(b(i + 2) << 1) | b(i + 3)];

            // Fill 4 bit-slots with the same QAM symbol waveform
            for (let symBit = 0; symBit < 4 && (i + symBit) < n; symBit++) {
                const off = (i + symBit) * spb;
                for (let s = 0; s < spb; s++) {
                    out[off + s] = (I * cosTable[s] + Q * sineTable[s]) * norm;
                }
            }
        }
    }

    return { bits: bitsStr, samplesPerBit: spb, samples: out };
}