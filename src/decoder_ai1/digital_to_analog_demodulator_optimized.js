import { modulate_original } from "../encoding/digital_to_analog_modulator";

function sanitizeBits(bits) {
    return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

// Lookup tables
const GRAY_TO_LEVEL = [-3, -1, 3, 1]; // index: 00=0, 01=1, 10=2, 11=3
const LEVEL_TO_GRAY = {
    '-3': [0, 0],
    '-1': [0, 1],
    '1': [1, 1],
    '3': [1, 0]
};

function clampNearestLevel(v) {
    const levels = [-3, -1, 1, 3];
    let best = levels[0];
    let bestD = Math.abs(v - best);

    for (let i = 1; i < 4; i++) {
        const d = Math.abs(v - levels[i]);
        if (d < bestD) {
            bestD = d;
            best = levels[i];
        }
    }
    return best;
}

function corrWithSin(samples, cyclesPerBit, N, invN) {
    const w = 2 * Math.PI * cyclesPerBit;
    let s = 0;
    for (let i = 0; i < N; i++) {
        s += samples[i] * Math.sin(w * i * invN);
    }
    return s;
}

function corrWithCos(samples, cyclesPerBit, N, invN) {
    const w = 2 * Math.PI * cyclesPerBit;
    let s = 0;
    for (let i = 0; i < N; i++) {
        s += samples[i] * Math.cos(w * i * invN);
    }
    return s;
}

function energy(samples, N) {
    let e = 0;
    for (let i = 0; i < N; i++) e += samples[i] * samples[i];
    return e / N;
}

function demod_ask(bitsLen, samples, spb) {
    const energies = new Float32Array(bitsLen);
    let mn = Infinity;
    let mx = -Infinity;

    // Calculate energies and find min/max in one pass
    for (let i = 0; i < bitsLen; i++) {
        const start = i * spb;
        let e = 0;
        for (let j = 0; j < spb; j++) {
            const val = samples[start + j];
            e += val * val;
        }
        e /= spb;
        energies[i] = e;
        if (e < mn) mn = e;
        if (e > mx) mx = e;
    }

    const thr = (mn + mx) * 0.5;
    let out = "";
    for (let i = 0; i < bitsLen; i++) {
        out += energies[i] > thr ? "1" : "0";
    }

    return { recoveredBits: out, note: "ASK: energy threshold decision." };
}

function demod_bfsk(bitsLen, samples, spb) {
    const f0 = 2;
    const f1 = 4;
    const invSpb = 1 / spb;
    const w0 = 2 * Math.PI * f0;
    const w1 = 2 * Math.PI * f1;

    let out = "";

    for (let i = 0; i < bitsLen; i++) {
        const start = i * spb;
        let c0 = 0, c1 = 0;

        for (let j = 0; j < spb; j++) {
            const t = j * invSpb;
            const val = samples[start + j];
            c0 += val * Math.sin(w0 * t);
            c1 += val * Math.sin(w1 * t);
        }

        out += Math.abs(c1) > Math.abs(c0) ? "1" : "0";
    }

    return { recoveredBits: out, note: "BFSK: max correlation among f0/f1." };
}

function demod_mfsk(bitsLen, samples, spb) {
    const k = 2;
    const base = 2;
    const delta = 1.0;
    const invSpb = 1 / spb;
    const TWO_PI = 2 * Math.PI;

    // Pre-compute omegas
    const omegas = new Float32Array([
        TWO_PI * (base - 1.5 * delta),
        TWO_PI * (base - 0.5 * delta),
        TWO_PI * (base + 0.5 * delta),
        TWO_PI * (base + 1.5 * delta)
    ]);

    const nSymbols = Math.ceil(bitsLen / k);
    const symVal = new Uint8Array(nSymbols);

    for (let s = 0; s < nSymbols; s++) {
        const i0 = s * k;
        const start = i0 * spb;

        let best = 0;
        let bestC = -1;

        for (let m = 0; m < 4; m++) {
            const w = omegas[m];
            let c = 0;

            for (let j = 0; j < spb; j++) {
                c += samples[start + j] * Math.sin(w * j * invSpb);
            }

            const absC = Math.abs(c);
            if (absC > bestC) {
                bestC = absC;
                best = m;
            }
        }

        symVal[s] = best;
    }

    let out = "";
    for (let i = 0; i < bitsLen; i++) {
        const s = Math.floor(i / k);
        const v = symVal[s];
        out += i % 2 === 0 ? String((v >> 1) & 1) : String(v & 1);
    }

    return { recoveredBits: out, note: "MFSK(4-FSK): max correlation among 4 freqs, expanded to 2 bits/symbol." };
}

function demod_bpsk(bitsLen, samples, spb) {
    const fc = 2;
    const invSpb = 1 / spb;
    const w = 2 * Math.PI * fc;

    let out = "";

    for (let i = 0; i < bitsLen; i++) {
        const start = i * spb;
        let c = 0;

        for (let j = 0; j < spb; j++) {
            c += samples[start + j] * Math.sin(w * j * invSpb);
        }

        out += c >= 0 ? "1" : "0";
    }

    return { recoveredBits: out, note: "PSK(BPSK): sign of correlation with reference carrier." };
}

function demod_dpsk(bitsLen, samples, spb) {
    const fc = 2;
    const invSpb = 1 / spb;
    const TWO_PI_FC = 2 * Math.PI * fc;

    // Pre-compute reference window
    const ref = new Float32Array(spb);
    for (let i = 0; i < spb; i++) {
        ref[i] = Math.sin(TWO_PI_FC * i * invSpb);
    }

    let out = "";
    const prev = new Float32Array(spb);

    // Copy reference to prev
    for (let i = 0; i < spb; i++) prev[i] = ref[i];

    for (let i = 0; i < bitsLen; i++) {
        const start = i * spb;
        let d = 0;

        // Dot product and copy current window
        for (let j = 0; j < spb; j++) {
            const cur = samples[start + j];
            d += cur * prev[j];
            prev[j] = cur;
        }

        out += d < 0 ? "1" : "0";
    }

    return { recoveredBits: out, note: "DPSK: differential detection via correlation between consecutive bit windows." };
}

function demod_qam(bitsLen, samples, spb) {
    const k = 4;
    const cycles = 2;
    const nSymbols = Math.ceil(bitsLen / k);
    const invSpb = 1 / spb;
    const TWO_PI_CYCLES = 2 * Math.PI * cycles;

    // Pre-compute cos/sin references and their power
    const cosRef = new Float32Array(spb);
    const sinRef = new Float32Array(spb);
    let cosPow = 0, sinPow = 0;

    for (let i = 0; i < spb; i++) {
        const t = i * invSpb;
        const c = Math.cos(TWO_PI_CYCLES * t);
        const s = Math.sin(TWO_PI_CYCLES * t);
        cosRef[i] = c;
        sinRef[i] = s;
        cosPow += c * c;
        sinPow += s * s;
    }

    const invCosPow = 1 / (cosPow || 1);
    const invSinPow = 1 / (sinPow || 1);
    const normInv = 4.242640687;

    const outBits = new Uint8Array(nSymbols * k);
    let outIdx = 0;

    for (let s = 0; s < nSymbols; s++) {
        const i0 = s * k;
        const start = i0 * spb;

        let Ic = 0, Qc = 0;
        for (let i = 0; i < spb; i++) {
            const val = samples[start + i];
            Ic += val * cosRef[i];
            Qc += val * sinRef[i];
        }

        const Iest = (Ic * invCosPow) * normInv;
        const Qest = (Qc * invSinPow) * normInv;

        const Iq = clampNearestLevel(Iest);
        const Qq = clampNearestLevel(Qest);

        const iGray = LEVEL_TO_GRAY[Iq];
        const qGray = LEVEL_TO_GRAY[Qq];

        outBits[outIdx++] = iGray[0];
        outBits[outIdx++] = iGray[1];
        outBits[outIdx++] = qGray[0];
        outBits[outIdx++] = qGray[1];
    }

    // Convert to string
    let recovered = "";
    for (let i = 0; i < Math.min(bitsLen, outBits.length); i++) {
        recovered += outBits[i];
    }

    return { recoveredBits: recovered, note: "16-QAM: estimate I/Q via correlation, nearest constellation (Gray)." };
}

export function demodulate_optimized(algorithm, bitsInput) {
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