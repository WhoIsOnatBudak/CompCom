function sanitizeBits(bits) {
    return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

export function encode_hp(algorithm, bitsInput) {
    const bits = sanitizeBits(bitsInput);
    const n = bits.length;

    // Default returns to match original logic exactly
    if (!algorithm || n === 0) {
        return { bits, stepsPerBit: 1, segments: [] };
    }

    const segments = new Array(n);
    let stepsPerBit = 1;

    if (algorithm === "NRZ-L") {
        for (let i = 0; i < n; i++) {
            // Maintains [[1], [-1]] structure
            segments[i] = [bits[i] === "1" ? 1 : -1];
        }
    }

    else if (algorithm === "NRZI") {
        let level = -1;
        for (let i = 0; i < n; i++) {
            if (bits[i] === "1") level = -level;
            segments[i] = [level];
        }
    }

    else if (algorithm === "Manchester") {
        stepsPerBit = 2;
        for (let i = 0; i < n; i++) {
            const isOne = bits[i] === "1";
            // 1: low->high [-1, 1], 0: high->low [1, -1]
            segments[i] = isOne ? [-1, 1] : [1, -1];
        }
    }

    else if (algorithm === "Differential Manchester") {
        stepsPerBit = 2;
        let level = 1;
        for (let i = 0; i < n; i++) {
            if (bits[i] === "0") level = -level;
            const first = level;
            const second = -level;
            segments[i] = [first, second];
            level = second;
        }
    }

    else if (algorithm === "Bipolar AMI") {
        let lastPulse = -1;
        for (let i = 0; i < n; i++) {
            if (bits[i] === "1") {
                lastPulse = -lastPulse;
                segments[i] = [lastPulse];
            } else {
                segments[i] = [0];
            }
        }
    }

    else if (algorithm === "Pseudoternary") {
        let lastPulse = -1;
        for (let i = 0; i < n; i++) {
            if (bits[i] === "0") {
                lastPulse = -lastPulse;
                segments[i] = [lastPulse];
            } else {
                segments[i] = [0];
            }
        }
    }

    else {
        return { bits, stepsPerBit: 1, segments: [] };
    }

    return { bits, stepsPerBit, segments };
}