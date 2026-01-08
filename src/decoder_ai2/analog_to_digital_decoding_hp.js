export function reconstruct_pcm_hp(bits, pcmBits, min, max, sampleCount) {
    const B = Math.min(8, Math.max(2, Number(pcmBits || 4)));
    const L = 1 << B;
    // Use multiplication by step instead of division where possible
    const step = L > 1 ? (max - min) / (L - 1) : 0;

    // Float32Array is much faster and uses 2x-4x less memory than a standard Array
    const y = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
        const start = i * B;
        if (start + B > bits.length) break;

        // Direct bit reconstruction from the string without slicing
        let code = 0;
        for (let j = 0; j < B; j++) {
            code = (code << 1) | (bits[start + j] === "1" ? 1 : 0);
        }

        // code is already bounded by B, but we ensure it matches the PCM levels
        const clamped = code >= L ? L - 1 : code;
        y[i] = min + clamped * step;
    }

    return y;
}

export function reconstruct_delta_hp(bits, stepSize) {
    const delta = Math.max(0.001, Number(stepSize || 0.2));
    const len = bits.length;
    const y = new Float32Array(len);

    let acc = 0;
    for (let i = 0; i < len; i++) {
        // Branchless-style update is often faster in modern JIT engines
        acc += (bits[i] === "1" ? delta : -delta);
        y[i] = acc;
    }
    return y;
}