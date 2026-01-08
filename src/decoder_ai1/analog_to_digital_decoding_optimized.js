// Lookup table for bit to int conversion (2-8 bit için)
const BIT_TO_INT_LOOKUP = (() => {
    const table = {};
    for (let bits = 2; bits <= 8; bits++) {
        table[bits] = {};
        const max = 1 << bits;
        for (let i = 0; i < max; i++) {
            let key = "";
            for (let j = bits - 1; j >= 0; j--) {
                key += (i >> j) & 1;
            }
            table[bits][key] = i;
        }
    }
    return table;
})();

function bitsToIntOptimized(bitStr, B) {
    // Lookup table kullan (çok daha hızlı)
    return BIT_TO_INT_LOOKUP[B][bitStr] || 0;
}

export function reconstruct_pcm_opt(bits, pcmBits, min, max, sampleCount) {
    const B = Math.min(8, Math.max(2, Number(pcmBits || 4)));
    const L = 1 << B;
    const step = L > 1 ? (max - min) / (L - 1) : 0;
    const Lminus1 = L - 1;

    const y = new Float32Array(sampleCount);
    const bitsLen = bits.length;

    // Eğer bits string ise, bir kez array'e çevir
    const bitsArr = typeof bits === 'string' ? bits : bits.join('');

    for (let i = 0; i < sampleCount; i++) {
        const start = i * B;
        const end = start + B;

        if (end > bitsLen) break;

        // Substring yerine lookup table kullan
        const chunk = bitsArr.substring(start, end);
        const code = bitsToIntOptimized(chunk, B);

        // Clamp
        const clamped = code > Lminus1 ? Lminus1 : (code < 0 ? 0 : code);
        y[i] = min + clamped * step;
    }

    return y;
}

export function reconstruct_delta_opt(bits, stepSize) {
    const delta = Math.max(0.001, Number(stepSize || 0.2));
    const len = bits.length;
    const y = new Float32Array(len);

    let acc = 0;

    // String optimization: charCodeAt daha hızlı
    if (typeof bits === 'string') {
        const CHAR_1 = 49; // '1'.charCodeAt(0)

        for (let i = 0; i < len; i++) {
            acc += bits.charCodeAt(i) === CHAR_1 ? delta : -delta;
            y[i] = acc;
        }
    } else {
        // Array case
        for (let i = 0; i < len; i++) {
            acc += bits[i] === "1" ? delta : -delta;
            y[i] = acc;
        }
    }

    return y;
}