import { generateWave2T } from "../analog/generateSignal";

function normalize(samples) {
    const len = samples.length;
    let mx = 0;

    // Tek geçişte max bul
    for (let i = 0; i < len; i++) {
        const abs = Math.abs(samples[i]);
        if (abs > mx) mx = abs;
    }

    if (mx === 0) return new Float32Array(len); // Sıfır array

    // In-place normalize (yeni array yerine mevcut array'i kullan)
    const result = new Float32Array(len);
    const invMx = 1 / mx; // Bölme yerine çarpma
    for (let i = 0; i < len; i++) {
        result[i] = samples[i] * invMx;
    }
    return result;
}

export function modulate_aa_optimized(algorithm, waveform) {
    const sig = generateWave2T(waveform || "Sine");
    const m = normalize(sig.samples);
    const fs = sig.fs;
    const len = m.length;

    // Sabitler
    const fc = 12;
    const ka = 0.7;
    const kf = 6;

    // Float32Array kullan (daha az bellek)
    const y = new Float32Array(len);

    // Ön hesaplama
    const TWO_PI = 2 * Math.PI;
    const TWO_PI_FC = TWO_PI * fc;
    const invFs = 1 / fs;

    if (algorithm === "AM") {
        for (let n = 0; n < len; n++) {
            const t = n * invFs; // Bölme yerine çarpma
            y[n] = (1 + ka * m[n]) * Math.cos(TWO_PI_FC * t);
        }
        return {
            x: sig.samples,
            y,
            fs,
            duration: sig.duration,
            note: `AM: y(t)=(1+ka*m(t))cos(2πfc t)`
        };
    }

    if (algorithm === "PM") {
        const kp = 1.2;
        for (let n = 0; n < len; n++) {
            const t = n * invFs;
            y[n] = Math.cos(TWO_PI_FC * t + kp * m[n]);
        }
        return {
            x: sig.samples,
            y,
            fs,
            duration: sig.duration,
            note: `PM: cos(2πfc t + kp·m(t))`
        };
    }

    if (algorithm === "FM") {
        const phaseIncrement = TWO_PI * kf * invFs;
        let phase = 0;

        for (let n = 0; n < len; n++) {
            const t = n * invFs;
            phase += phaseIncrement * m[n];
            y[n] = Math.cos(TWO_PI_FC * t + phase);
        }
        return {
            x: sig.samples,
            y,
            fs,
            duration: sig.duration,
            note: `FM: cos(2πfc t + kf∫m(t)dt)`
        };
    }

    return {
        x: sig.samples,
        y: new Float32Array(0),
        fs,
        duration: sig.duration,
        note: "Choose AM, FM or PM."
    };
}