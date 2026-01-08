export function adc_pcm_hp(samples, pcmBits) {
    const B = Math.min(8, Math.max(2, Number(pcmBits || 4)));
    const len = samples.length;
    const L = 1 << B;

    // Single-pass Min/Max search is faster
    let mn = samples[0], mx = samples[0];
    for (let i = 1; i < len; i++) {
        const v = samples[i];
        if (v < mn) mn = v;
        else if (v > mx) mx = v;
    }

    const codes = new Uint32Array(len);
    // Using an array of strings then joining at the end is much faster than +=
    const bitParts = new Array(len);

    if (mx === mn) {
        const codeStr = "0".repeat(B);
        bitParts.fill(codeStr);
        return { bits: bitParts.join(""), codes, min: mn, max: mx, levels: L };
    }

    const stepInv = (L - 1) / (mx - mn); // Multiply by inverse instead of dividing

    for (let i = 0; i < len; i++) {
        const q = Math.round((samples[i] - mn) * stepInv);
        const code = q < 0 ? 0 : (q >= L ? L - 1 : q); // Manual clamp is faster than Math.min/max
        codes[i] = code;

        // Inline bit conversion to avoid function call overhead
        let s = "";
        for (let b = B - 1; b >= 0; b--) {
            s += (code >> b) & 1 ? "1" : "0";
        }
        bitParts[i] = s;
    }

    return { bits: bitParts.join(""), codes, min: mn, max: mx, levels: L };
}

export function adc_delta_hp(samples, stepSize) {
    const delta = Math.max(0.001, Number(stepSize || 0.2));
    const len = samples.length;

    let y = 0;
    const rec = new Float32Array(len); // Efficient numeric storage
    const bitParts = new Array(len);

    for (let i = 0; i < len; i++) {
        if (samples[i] >= y) {
            bitParts[i] = "1";
            y += delta;
        } else {
            bitParts[i] = "0";
            y -= delta;
        }
        rec[i] = y;
    }

    return { bits: bitParts.join(""), reconstructed: rec, step: delta };
}