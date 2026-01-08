/**
 * Optimized Moving Average using Float32Array and hoisted division.
 */
function movingAverage(x, win) {
    const n = x.length;
    const w = Math.max(1, win | 0);
    const out = new Float32Array(n);
    let sum = 0;

    for (let i = 0; i < n; i++) {
        sum += x[i];
        if (i >= w) sum -= x[i - w];
        // Use the exact original logic for the divisor
        out[i] = sum / Math.min(w, i + 1);
    }
    return out;
}

/**
 * Optimized Phase Unwrapping.
 */
function unwrapPhase(ph) {
    const n = ph.length;
    const out = new Float32Array(n);
    out[0] = ph[0];
    let offset = 0;
    const TWO_PI = 2 * Math.PI;

    for (let i = 1; i < n; i++) {
        let dp = ph[i] - ph[i - 1];
        if (dp > Math.PI) offset -= TWO_PI;
        else if (dp < -Math.PI) offset += TWO_PI;
        out[i] = ph[i] + offset;
    }
    return out;
}

/**
 * Optimized IQ Demodulation.
 */
function iqDemod(y, fs, fc) {
    const n = y.length;
    const I = new Float32Array(n);
    const Q = new Float32Array(n);
    const invFs = 1 / fs;
    const TWO_PI_FC = 2 * Math.PI * fc;

    for (let nIdx = 0; nIdx < n; nIdx++) {
        const t = nIdx * invFs;
        const arg = TWO_PI_FC * t;
        I[nIdx] = y[nIdx] * Math.cos(arg);
        Q[nIdx] = -y[nIdx] * Math.sin(arg);
    }

    const win = Math.max(5, Math.floor(fs / fc));
    const If = movingAverage(I, win);
    const Qf = movingAverage(Q, win);

    return { I: If, Q: Qf, win };
}

export function demodulate_aa_hp(algorithm, y, fs) {
    const fc = 12;
    const ka = 0.7;
    const kf = 6;
    const kp = 1.2;
    const n = y ? y.length : 0;

    if (n === 0) return { mhat: new Float32Array(0), note: "No signal" };

    const invFs = 1 / fs;
    const TWO_PI = 2 * Math.PI;

    if (algorithm === "AM") {
        const mixed = new Float32Array(n);
        const TWO_PI_FC = TWO_PI * fc;
        for (let i = 0; i < n; i++) {
            mixed[i] = y[i] * Math.cos(TWO_PI_FC * (i * invFs));
        }

        const win = Math.max(7, Math.floor(fs / 25));
        const base = movingAverage(mixed, win);

        // Map replacement: solve for m(t) and normalize
        const mhat = new Float32Array(n);
        const invKa = 1 / ka;
        for (let i = 0; i < n; i++) {
            mhat[i] = (2 * base[i] - 1) * invKa;
        }

        // Fix startup transient
        for (let i = 0; i < win; i++) {
            mhat[i] = mhat[win];
        }

        // Normalize
        let mx = 0;
        for (let i = 0; i < n; i++) {
            const absVal = Math.abs(mhat[i]);
            if (absVal > mx) mx = absVal;
        }
        mx = mx || 1;
        const invMx = 1 / mx;
        for (let i = 0; i < n; i++) mhat[i] *= invMx;

        return { mhat, note: "AM demod: coherent mix + LPF + detrend + scale" };
    }

    if (algorithm === "PM" || algorithm === "FM") {
        const { I, Q } = iqDemod(y, fs, fc);
        const ph = new Float32Array(n);
        for (let i = 0; i < n; i++) ph[i] = Math.atan2(Q[i], I[i]);
        const pu = unwrapPhase(ph);

        let mhat = new Float32Array(n);

        if (algorithm === "PM") {
            const dphi = new Float32Array(n);
            for (let i = 1; i < n; i++) dphi[i] = pu[i] - pu[i - 1];

            const perr = new Float32Array(n);
            for (let i = 1; i < n; i++) perr[i] = perr[i - 1] + dphi[i];

            const invKp = 1 / kp;
            let mean = 0;
            for (let i = 0; i < n; i++) {
                mhat[i] = perr[i] * invKp;
                mean += mhat[i];
            }
            mean /= n;
            for (let i = 0; i < n; i++) mhat[i] -= mean;

        } else { // FM
            const invKf = 1 / kf;
            const fsOverTwoPi = fs / TWO_PI;
            let mean = 0;
            for (let i = 1; i < n; i++) {
                const instFreq = (pu[i] - pu[i - 1]) * fsOverTwoPi;
                mhat[i] = (instFreq - fc) * invKf;
                mean += mhat[i];
            }
            mhat[0] = mhat[1] || 0;
            mean /= n;
            for (let i = 0; i < n; i++) mhat[i] -= mean;
        }

        const sm = movingAverage(mhat, Math.max(7, Math.floor(fs / (fc * 0.6))));
        return { mhat: sm, note: `${algorithm} demod: process + LPF` };
    }

    return { mhat: new Float32Array(0), note: "Unsupported algorithm" };
}