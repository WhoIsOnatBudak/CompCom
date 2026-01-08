function movingAverage(x, win) {
    const w = Math.max(1, win | 0);
    const len = x.length;
    const out = new Float32Array(len);
    let sum = 0;

    for (let i = 0; i < len; i++) {
        sum += x[i];
        if (i >= w) sum -= x[i - w];
        out[i] = sum / Math.min(w, i + 1);
    }
    return out;
}

function unwrapPhase(ph) {
    const len = ph.length;
    const out = new Float32Array(len);
    out[0] = ph[0];
    let offset = 0;
    const TWO_PI = 2 * Math.PI;
    const PI = Math.PI;

    for (let i = 1; i < len; i++) {
        const dp = ph[i] - ph[i - 1];
        if (dp > PI) offset -= TWO_PI;
        else if (dp < -PI) offset += TWO_PI;
        out[i] = ph[i] + offset;
    }
    return out;
}

function iqDemod(y, fs, fc) {
    const len = y.length;
    const I = new Float32Array(len);
    const Q = new Float32Array(len);

    const invFs = 1 / fs;
    const TWO_PI_FC = 2 * Math.PI * fc;

    for (let n = 0; n < len; n++) {
        const t = n * invFs;
        const wt = TWO_PI_FC * t;
        const c = Math.cos(wt);
        const s = Math.sin(wt);

        I[n] = y[n] * c;
        Q[n] = -y[n] * s;
    }

    // LPF: window ~ (fs/fc)
    const win = Math.max(5, Math.floor(fs / fc));
    const If = movingAverage(I, win);
    const Qf = movingAverage(Q, win);

    return { I: If, Q: Qf, win };
}

export function demodulate_aa_optimized(algorithm, y, fs) {
    const fc = 12;
    const ka = 0.7;
    const kf = 6;
    const kp = 1.2;

    const len = y.length;
    if (!y || len === 0) return { mhat: new Float32Array(0), note: "No signal" };

    const TWO_PI = 2 * Math.PI;
    const invFs = 1 / fs;

    if (algorithm === "AM") {
        const mixed = new Float32Array(len);
        const TWO_PI_FC = TWO_PI * fc;

        for (let n = 0; n < len; n++) {
            const t = n * invFs;
            mixed[n] = y[n] * Math.cos(TWO_PI_FC * t);
        }

        const win = Math.max(7, Math.floor(fs / 25));
        const base = movingAverage(mixed, win);

        // DC removal: base contains 0.5 * (1 + ka * m(t))
        // Solve: m(t) = (2 * base - 1) / ka
        const invKa = 1 / ka;
        const mhat = new Float32Array(len);

        for (let i = 0; i < len; i++) {
            mhat[i] = (2 * base[i] - 1) * invKa;
        }

        // Remove startup transient
        const stableValue = mhat[win];
        for (let i = 0; i < win; i++) {
            mhat[i] = stableValue;
        }

        // Normalize
        let mx = 0;
        for (let i = 0; i < len; i++) {
            const abs = Math.abs(mhat[i]);
            if (abs > mx) mx = abs;
        }

        const invMx = mx > 0 ? 1 / mx : 1;
        for (let i = 0; i < len; i++) {
            mhat[i] *= invMx;
        }

        return { mhat, note: "AM demod: coherent mix + LPF + detrend + scale" };
    }

    if (algorithm === "PM") {
        const { I, Q } = iqDemod(y, fs, fc);

        const ph = new Float32Array(len);
        for (let n = 0; n < len; n++) {
            ph[n] = Math.atan2(Q[n], I[n]);
        }

        const pu = unwrapPhase(ph);

        // Phase difference
        const dphi = new Float32Array(len);
        dphi[0] = 0;
        for (let n = 1; n < len; n++) {
            dphi[n] = pu[n] - pu[n - 1];
        }

        // Integrate back
        const perr = new Float32Array(len);
        perr[0] = 0;
        for (let n = 1; n < len; n++) {
            perr[n] = perr[n - 1] + dphi[n];
        }

        // Scale and remove mean
        const invKp = 1 / kp;
        let sum = 0;
        const mhat = new Float32Array(len);

        for (let i = 0; i < len; i++) {
            mhat[i] = perr[i] * invKp;
            sum += mhat[i];
        }

        const mean = sum / len;
        for (let i = 0; i < len; i++) {
            mhat[i] -= mean;
        }

        const sm = movingAverage(mhat, Math.max(7, Math.floor(fs / (fc * 0.6))));
        return { mhat: sm, note: "PM demod: phase -> diff -> integrate -> /kp + LPF" };
    }

    if (algorithm === "FM") {
        const { I, Q } = iqDemod(y, fs, fc);

        const ph = new Float32Array(len);
        for (let n = 0; n < len; n++) {
            ph[n] = Math.atan2(Q[n], I[n]);
        }

        const pu = unwrapPhase(ph);

        // Instantaneous frequency
        const instFreq = new Float32Array(len);
        const scale = fs / TWO_PI;

        for (let n = 1; n < len; n++) {
            instFreq[n] = (pu[n] - pu[n - 1]) * scale;
        }
        instFreq[0] = instFreq[1] || 0;

        // mhat = (f - fc) / kf and remove mean
        const invKf = 1 / kf;
        let sum = 0;
        const mhat = new Float32Array(len);

        for (let i = 0; i < len; i++) {
            mhat[i] = (instFreq[i] - fc) * invKf;
            sum += mhat[i];
        }

        const mean = sum / len;
        for (let i = 0; i < len; i++) {
            mhat[i] -= mean;
        }

        const sm = movingAverage(mhat, Math.max(7, Math.floor(fs / (fc * 0.6))));
        return { mhat: sm, note: "FM demod: phase diff -> instFreq -> (f-fc)/kf + LPF" };
    }

    return { mhat: new Float32Array(0), note: "Unsupported algorithm" };
}