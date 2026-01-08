import { generateWave2T } from "../analog/generateSignal";

// Faster normalization: No .map(), no extra array copies
function normalizeInPlace(samples) {
    let mx = 0;
    const len = samples.length;
    for (let i = 0; i < len; i++) {
        const abs = Math.abs(samples[i]);
        if (abs > mx) mx = abs;
    }
    if (mx === 0) return samples;

    const invMx = 1 / mx;
    for (let i = 0; i < len; i++) {
        samples[i] *= invMx;
    }
    return samples;
}

export function modulate_aa_hp(algorithm, waveform) {
    const sig = generateWave2T(waveform || "Sine");
    const fs = sig.fs;

    // Use Float32Array for better memory management
    const m = normalizeInPlace(new Float32Array(sig.samples));
    const len = m.length;
    const y = new Float32Array(len);

    // Constants
    const fc = 12;
    const ka = 0.7;
    const kf = 6;
    const kp = 1.2;
    const TWO_PI = 2 * Math.PI;
    const TWO_PI_FC = TWO_PI * fc;
    const TWO_PI_KF = TWO_PI * kf;
    const invFs = 1 / fs;

    if (algorithm === "AM") {
        for (let n = 0; n < len; n++) {
            const t = n * invFs;
            y[n] = (1 + ka * m[n]) * Math.cos(TWO_PI_FC * t);
        }
    }

    else if (algorithm === "PM") {
        for (let n = 0; n < len; n++) {
            const t = n * invFs;
            y[n] = Math.cos(TWO_PI_FC * t + kp * m[n]);
        }
    }

    else if (algorithm === "FM") {
        let phase = 0;
        for (let n = 0; n < len; n++) {
            const t = n * invFs;
            // Exact logic from your original code
            phase += (TWO_PI_KF * m[n]) * invFs;
            y[n] = Math.cos(TWO_PI_FC * t + phase);
        }
    }

    return {
        x: sig.samples,
        y,
        fs,
        duration: sig.duration,
        note: algorithm === "FM" ? `FM: cos(2πfc t + kf∫m(t)dt)` : "Modulated Signal"
    };
}