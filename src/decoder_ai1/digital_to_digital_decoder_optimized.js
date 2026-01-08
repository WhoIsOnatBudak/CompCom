import { encode_original } from "../encoding/digital_to_digital_encoder";

function sanitizeBits(bits) {
    return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

function decodeFromSegments(algorithm, n, segments) {
    if (!algorithm || !segments || segments.length === 0) {
        return { recoveredBits: "", valid: false, note: "No encoded segments." };
    }

    // Pre-allocate result array
    const outArr = new Uint8Array(n);

    if (algorithm === "NRZ-L") {
        for (let i = 0; i < n; i++) {
            outArr[i] = segments[i][0] > 0 ? 49 : 48; // '1' : '0'
        }
        return {
            recoveredBits: String.fromCharCode(...outArr),
            valid: true,
            note: "NRZ-L decoded by sign."
        };
    }

    if (algorithm === "NRZI") {
        let prev = -1; // encoder starts at -1
        for (let i = 0; i < n; i++) {
            const cur = segments[i][0];
            outArr[i] = cur !== prev ? 49 : 48; // '1' : '0'
            prev = cur;
        }
        return {
            recoveredBits: String.fromCharCode(...outArr),
            valid: true,
            note: "NRZI decoded by transition."
        };
    }

    if (algorithm === "Manchester") {
        let hasError = false;
        for (let i = 0; i < n; i++) {
            const a = segments[i][0];
            const b = segments[i][1];

            if (a < 0 && b > 0) {
                outArr[i] = 49; // '1'
            } else if (a > 0 && b < 0) {
                outArr[i] = 48; // '0'
            } else {
                outArr[i] = 63; // '?'
                hasError = true;
            }
        }
        return {
            recoveredBits: String.fromCharCode(...outArr),
            valid: !hasError,
            note: "Manchester decoded by mid-bit pattern."
        };
    }

    if (algorithm === "Differential Manchester") {
        let prevEnd = 1; // encoder starts at +1
        for (let i = 0; i < n; i++) {
            const first = segments[i][0];
            const second = segments[i][1];
            const startTransition = first !== prevEnd;
            outArr[i] = startTransition ? 48 : 49; // '0' : '1'
            prevEnd = second;
        }
        return {
            recoveredBits: String.fromCharCode(...outArr),
            valid: true,
            note: "Diff Manchester decoded by start transition."
        };
    }

    if (algorithm === "Bipolar AMI") {
        for (let i = 0; i < n; i++) {
            outArr[i] = segments[i][0] === 0 ? 48 : 49; // '0' : '1'
        }
        return {
            recoveredBits: String.fromCharCode(...outArr),
            valid: true,
            note: "AMI decoded by zero vs pulse."
        };
    }

    if (algorithm === "Pseudoternary") {
        for (let i = 0; i < n; i++) {
            outArr[i] = segments[i][0] === 0 ? 49 : 48; // '1' : '0'
        }
        return {
            recoveredBits: String.fromCharCode(...outArr),
            valid: true,
            note: "Pseudoternary decoded by zero vs pulse."
        };
    }

    return {
        recoveredBits: "",
        valid: false,
        note: "Decoder not implemented for this algorithm."
    };
}

export function decode_dd_optimized(algorithm, bitsInput) {
    const bits = sanitizeBits(bitsInput);
    const n = bits.length;
    const encoded = encode_original(algorithm, bits);
    const decoded = decodeFromSegments(algorithm, n, encoded.segments);

    const ok = decoded.recoveredBits === bits;
    return {
        inputBits: bits,
        recoveredBits: decoded.recoveredBits,
        ok,
        valid: decoded.valid,
        note: decoded.note,
    };
}