import { encode_original } from "../encoders/encode_original";

function sanitizeBits(bits) {
  return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

function decodeFromSegments(algorithm, bits, segments) {
  const n = bits.length;
  if (!algorithm || !segments || segments.length === 0) {
    return { recoveredBits: "", valid: false, note: "No encoded segments." };
  }

  if (algorithm === "NRZ-L") {
    let out = "";
    for (let i = 0; i < n; i++) out += segments[i][0] > 0 ? "1" : "0";
    return { recoveredBits: out, valid: true, note: "NRZ-L decoded by sign." };
  }

  if (algorithm === "NRZI") {
    let out = "";
    let prev = -1; // encoder starts at -1
    for (let i = 0; i < n; i++) {
      const cur = segments[i][0];
      out += cur !== prev ? "1" : "0";
      prev = cur;
    }
    return { recoveredBits: out, valid: true, note: "NRZI decoded by transition." };
  }

  if (algorithm === "Manchester") {
    let out = "";
    for (let i = 0; i < n; i++) {
      const a = segments[i][0];
      const b = segments[i][1];
      if (a < 0 && b > 0) out += "1";
      else if (a > 0 && b < 0) out += "0";
      else out += "?";
    }
    return { recoveredBits: out, valid: !out.includes("?"), note: "Manchester decoded by mid-bit pattern." };
  }

  if (algorithm === "Differential Manchester") {
    let out = "";
    let prevEnd = 1; // encoder starts at +1 and ends each bit at second
    for (let i = 0; i < n; i++) {
      const first = segments[i][0];
      const second = segments[i][1];
      const startTransition = first !== prevEnd;
      out += startTransition ? "0" : "1";
      prevEnd = second;
    }
    return { recoveredBits: out, valid: true, note: "Diff Manchester decoded by start transition." };
  }

  if (algorithm === "Bipolar AMI") {
    let out = "";
    for (let i = 0; i < n; i++) out += segments[i][0] === 0 ? "0" : "1";
    return { recoveredBits: out, valid: true, note: "AMI decoded by zero vs pulse." };
  }

  if (algorithm === "Pseudoternary") {
    let out = "";
    for (let i = 0; i < n; i++) out += segments[i][0] === 0 ? "1" : "0";
    return { recoveredBits: out, valid: true, note: "Pseudoternary decoded by zero vs pulse." };
  }

  return { recoveredBits: "", valid: false, note: "Decoder not implemented for this algorithm." };
}

export function decode_dd(algorithm, bitsInput) {
  const bits = sanitizeBits(bitsInput);
  const encoded = encode_original(algorithm, bits);
  const decoded = decodeFromSegments(algorithm, bits, encoded.segments);

  const ok = decoded.recoveredBits === bits;
  return {
    inputBits: bits,
    recoveredBits: decoded.recoveredBits,
    ok,
    valid: decoded.valid,
    note: decoded.note,
  };
}
