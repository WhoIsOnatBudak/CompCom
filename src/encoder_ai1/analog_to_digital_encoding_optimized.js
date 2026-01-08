// Lookup table ile bit string oluşturma (8 bit'e kadar)
const BIT_LOOKUP = (() => {
    const table = {};
    for (let bits = 2; bits <= 8; bits++) {
        table[bits] = new Array(1 << bits);
        for (let i = 0; i < (1 << bits); i++) {
            let s = "";
            for (let j = bits - 1; j >= 0; j--) {
                s += (i >> j) & 1;
            }
            table[bits][i] = s;
        }
    }
    return table;
})();

function toBitsUnsigned(x, bits) {
    return BIT_LOOKUP[bits][x];
}

export function adc_pcm_opt(samples, pcmBits) {
    const N = samples.length;
    const B = Math.min(8, Math.max(2, Number(pcmBits || 4)));

    // Min/max bulma - tek geçiş
    let mn = samples[0];
    let mx = samples[0];

    for (let i = 1; i < N; i++) {
        const v = samples[i];
        if (v < mn) mn = v;
        if (v > mx) mx = v;
    }

    const L = 1 << B;

    // Aynı değer kontrolü - early return
    if (mx === mn) {
        const zeroBits = BIT_LOOKUP[B][0];
        const bits = zeroBits.repeat(N);
        const codes = new Uint8Array(N); // 0 ile dolu
        return { bits, codes, min: mn, max: mx, levels: L };
    }

    const stepInv = (L - 1) / (mx - mn); // Bölme yerine çarpma için
    const Lminus1 = L - 1;

    const codes = new Uint8Array(N); // Array yerine TypedArray
    const bitChunks = new Array(N); // Pre-allocated array

    for (let i = 0; i < N; i++) {
        let q = Math.round((samples[i] - mn) * stepInv);

        // Clamp
        if (q < 0) q = 0;
        else if (q > Lminus1) q = Lminus1;

        codes[i] = q;
        bitChunks[i] = BIT_LOOKUP[B][q]; // Lookup table kullan
    }

    const bits = bitChunks.join(""); // Tek seferde birleştir

    return { bits, codes, min: mn, max: mx, levels: L };
}

export function adc_delta_opt(samples, stepSize) {
    const N = samples.length;
    const delta = Math.max(0.001, Number(stepSize || 0.2));

    let y = 0;
    const rec = new Float32Array(N); // TypedArray
    const bitChunks = new Array(N); // Pre-allocated

    for (let i = 0; i < N; i++) {
        const x = samples[i];
        if (x >= y) {
            bitChunks[i] = "1";
            y += delta;
        } else {
            bitChunks[i] = "0";
            y -= delta;
        }
        rec[i] = y;
    }

    const bits = bitChunks.join(""); // Tek seferde birleştir

    return { bits, reconstructed: rec, step: delta };
}