import { modulate_hp } from "../encoder_ai2/digital_to_analog_modulator_hp";

function sanitizeBits(bits) {
    return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

// Logic-identical clamp from your original
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
    if (level === -3) return [0, 0];
    if (level === -1) return [0, 1];
    if (level === 1) return [1, 1];
    return [1, 0];
}

// Faster Correlation: No slicing, just index offsets
function corrWithSin(samples, offset, spb, cyclesPerBit) {
    const w = (2 * Math.PI * cyclesPerBit) / spb;
    let s = 0;
    for (let i = 0; i < spb; i++) {
        s += samples[offset + i] * Math.sin(w * i);
    }
    return s;
}

function energy(samples, offset, spb) {
    let e = 0;
    for (let i = 0; i < spb; i++) {
        const x = samples[offset + i];
        e += x * x;
    }
    return e / Math.max(1, spb);
}

export function demodulate_hp(algorithm, bitsInput, modData) {
    const bits = sanitizeBits(bitsInput);
    const bitsLen = bits.length;

    // Use modData if passed (faster), otherwise re-modulate using your new HP modulator
    const mod = modData || modulate_hp(algorithm, bits);
    const samples = mod.samples || [];
    const spb = mod.samplesPerBit || 0;

    if (!algorithm || bitsLen === 0 || samples.length === 0) {
        return { inputBits: bits, recoveredBits: "", ok: false, note: "Signal missing." };
    }

    const bitResult = new Uint8Array(bitsLen); // ASCII Buffer: 48='0', 49='1'

    if (algorithm === "ASK") {
        const energies = new Float32Array(bitsLen);
        for (let i = 0; i < bitsLen; i++) energies[i] = energy(samples, i * spb, spb);

        let mn = energies[0], mx = energies[0];
        for (let i = 0; i < bitsLen; i++) {
            if (energies[i] < mn) mn = energies[i];
            if (energies[i] > mx) mx = energies[i];
        }
        const thr = (mn + mx) / 2;
        for (let i = 0; i < bitsLen; i++) bitResult[i] = energies[i] > thr ? 49 : 48;
    }

    else if (algorithm === "BFSK") {
        for (let i = 0; i < bitsLen; i++) {
            const off = i * spb;
            const c0 = Math.abs(corrWithSin(samples, off, spb, 2));
            const c1 = Math.abs(corrWithSin(samples, off, spb, 4));
            bitResult[i] = c1 > c0 ? 49 : 48;
        }
    }

    else if (algorithm === "MFSK") {
        const freqs = [0.5, 1.5, 2.5, 3.5]; // base=2, delta=1.0 logic from original
        for (let i = 0; i < bitsLen; i += 2) {
            const off = i * spb;
            let best = 0, bestC = -1;
            for (let m = 0; m < 4; m++) {
                const c = Math.abs(corrWithSin(samples, off, spb, freqs[m]));
                if (c > bestC) { bestC = c; best = m; }
            }
            bitResult[i] = ((best >> 1) & 1) ? 49 : 48;
            if (i + 1 < bitsLen) bitResult[i + 1] = (best & 1) ? 49 : 48;
        }
    }

    else if (algorithm === "PSK" || algorithm === "BPSK") {
        for (let i = 0; i < bitsLen; i++) {
            const c = corrWithSin(samples, i * spb, spb, 2);
            bitResult[i] = c >= 0 ? 49 : 48;
        }
    }

    else if (algorithm === "DPSK") {
        const fc = 2;
        const ref = new Float32Array(spb);
        for (let i = 0; i < spb; i++) ref[i] = Math.sin(2 * Math.PI * fc * (i / spb));

        let prevOff = -1; // -1 indicates we use the 'ref' window for the first bit
        for (let i = 0; i < bitsLen; i++) {
            const off = i * spb;
            let dot = 0;
            for (let s = 0; s < spb; s++) {
                const prevVal = (prevOff === -1) ? ref[s] : samples[prevOff + s];
                dot += samples[off + s] * prevVal;
            }
            bitResult[i] = dot < 0 ? 49 : 48;
            prevOff = off;
        }
    }

    else if (algorithm === "QAM") {
        const cycles = 2;
        const normInv = 4.242640687;
        for (let s = 0; s < bitsLen; s += 4) {
            const off = s * spb;
            let Ic = 0, Qc = 0, cosPow = 0, sinPow = 0;
            for (let i = 0; i < spb; i++) {
                const t = i / spb;
                const c = Math.cos(2 * Math.PI * cycles * t);
                const sn = Math.sin(2 * Math.PI * cycles * t);
                Ic += samples[off + i] * c;
                Qc += samples[off + i] * sn;
                cosPow += c * c;
                sinPow += sn * sn;
            }
            const Iq = clampNearestLevel((Ic / cosPow) * normInv);
            const Qq = clampNearestLevel((Qc / sinPow) * normInv);
            const [iB1, iB0] = levelToGray2Bits(Iq);
            const [qB1, qB0] = levelToGray2Bits(Qq);
            const sym = [iB1, iB0, qB1, qB0];
            for (let j = 0; j < 4 && (s + j) < bitsLen; j++) bitResult[s + j] = sym[j] ? 49 : 48;
        }
    }

    const recoveredBits = String.fromCharCode(...bitResult);
    return {
        inputBits: bits,
        recoveredBits,
        ok: recoveredBits === bits,
        note: algorithm + " (Optimized Logic-Exact)"
    };
}