function sanitizeBits(bits) {
  return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

// levels: -1 (negative/low), 0 (zero), +1 (positive/high)
// return: { bits, stepsPerBit, segments }
// segments: Array< Array<number> >  // per-bit steps, e.g. [[-1],[+1]] or [[-1,+1], ...]
export function encode_original(algorithm, bitsInput) {
  const bits = sanitizeBits(bitsInput);
  const b = bits.split("").map((x) => (x === "1" ? 1 : 0));

  if (!algorithm) return { bits, stepsPerBit: 1, segments: [] };
  if (b.length === 0) return { bits, stepsPerBit: 1, segments: [] };

  // Default 1 step per bit, except Manchester variants (2)
  let stepsPerBit = 1;
  const segments = [];

  if (algorithm === "NRZ-L") {
    for (const bit of b) segments.push([bit ? 1 : -1]);
    return { bits, stepsPerBit, segments };
  }

  if (algorithm === "NRZI") {
    let level = -1;
    for (const bit of b) {
      if (bit === 1) level = -level;
      segments.push([level]);
    }
    return { bits, stepsPerBit, segments };
  }

  if (algorithm === "Manchester") {
    stepsPerBit = 2;
    for (const bit of b) {
      segments.push(bit === 1 ? [-1, 1] : [1, -1]); // 1: low->high, 0: high->low
    }
    return { bits, stepsPerBit, segments };
  }

  if (algorithm === "Differential Manchester") {
    stepsPerBit = 2;
    let level = 1;
    for (const bit of b) {
      if (bit === 0) level = -level;       // transition at start for 0
      const first = level;
      const second = -level;               // always mid-bit transition
      segments.push([first, second]);
      level = second;
    }
    return { bits, stepsPerBit, segments };
  }

  if (algorithm === "Bipolar AMI") {
    let lastPulse = -1;
    for (const bit of b) {
      if (bit === 0) segments.push([0]);
      else {
        lastPulse = -lastPulse;            // alternate + / -
        segments.push([lastPulse]);
      }
    }
    return { bits, stepsPerBit, segments };
  }

  if (algorithm === "Pseudoternary") {
    let lastPulse = -1;
    for (const bit of b) {
      if (bit === 1) segments.push([0]);
      else {
        lastPulse = -lastPulse;
        segments.push([lastPulse]);
      }
    }
    return { bits, stepsPerBit, segments };
  }

  return { bits, stepsPerBit: 1, segments: [] };
}
