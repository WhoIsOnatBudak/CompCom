function bitsToInt(bitStr) {
  let v = 0;
  for (let i = 0; i < bitStr.length; i++) v = (v << 1) | (bitStr[i] === "1" ? 1 : 0);
  return v;
}

export function reconstruct_pcm_from_bits(bits, pcmBits, min, max, sampleCount) {
  const B = Math.min(8, Math.max(2, Number(pcmBits || 4)));
  const L = 1 << B;
  const step = L > 1 ? (max - min) / (L - 1) : 0;

  const y = new Array(sampleCount).fill(0);

  for (let i = 0; i < sampleCount; i++) {
    const start = i * B;
    const chunk = bits.slice(start, start + B);
    if (chunk.length < B) break;

    const code = bitsToInt(chunk);
    const clamped = Math.min(L - 1, Math.max(0, code));
    y[i] = min + clamped * step;
  }

  return y;
}

export function reconstruct_delta_from_bits(bits, stepSize) {
  const delta = Math.max(0.001, Number(stepSize || 0.2));
  const y = new Array(bits.length);

  let acc = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "1") acc += delta;
    else acc -= delta;
    y[i] = acc;
  }
  return y;
}
