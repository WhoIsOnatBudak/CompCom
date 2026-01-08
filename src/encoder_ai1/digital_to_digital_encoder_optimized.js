function sanitizeBits(bits) {
    return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

// Manchester patterns için regular array kullan (immutable olarak)
const MANCHESTER_1 = [-1, 1];
const MANCHESTER_0 = [1, -1];

export function encode_optimized(algorithm, bitsInput) {
    const bits = sanitizeBits(bitsInput);
    const n = bits.length;

    if (!algorithm || n === 0) {
        return { bits, stepsPerBit: 1, segments: [] };
    }

    // Bit array'i bir kez oluştur
    const b = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        b[i] = bits.charCodeAt(i) - 48; // '0'=48, '1'=49
    }

    let stepsPerBit = 1;
    const segments = new Array(n); // Pre-allocated

    if (algorithm === "NRZ-L") {
        for (let i = 0; i < n; i++) {
            segments[i] = [b[i] ? 1 : -1];
        }
        return { bits, stepsPerBit, segments };
    }

    if (algorithm === "NRZI") {
        let level = -1;
        for (let i = 0; i < n; i++) {
            if (b[i] === 1) level = -level;
            segments[i] = [level];
        }
        return { bits, stepsPerBit, segments };
    }

    if (algorithm === "Manchester") {
        stepsPerBit = 2;
        for (let i = 0; i < n; i++) {
            // Pattern'leri kopyala (slice ile yeni array)
            segments[i] = b[i] === 1 ? MANCHESTER_1.slice() : MANCHESTER_0.slice();
        }
        return { bits, stepsPerBit, segments };
    }

    if (algorithm === "Differential Manchester") {
        stepsPerBit = 2;
        let level = 1;
        for (let i = 0; i < n; i++) {
            if (b[i] === 0) level = -level;
            const first = level;
            const second = -level;
            segments[i] = [first, second];
            level = second;
        }
        return { bits, stepsPerBit, segments };
    }

    if (algorithm === "Bipolar AMI") {
        let lastPulse = -1;
        for (let i = 0; i < n; i++) {
            if (b[i] === 0) {
                segments[i] = [0];
            } else {
                lastPulse = -lastPulse;
                segments[i] = [lastPulse];
            }
        }
        return { bits, stepsPerBit, segments };
    }

    if (algorithm === "Pseudoternary") {
        let lastPulse = -1;
        for (let i = 0; i < n; i++) {
            if (b[i] === 1) {
                segments[i] = [0];
            } else {
                lastPulse = -lastPulse;
                segments[i] = [lastPulse];
            }
        }
        return { bits, stepsPerBit, segments };
    }

    return { bits, stepsPerBit: 1, segments: [] };
}