import { encode_hp } from "../encoder_ai2/digital_to_digital_encoder_hp";

function sanitizeBits(bits) {
    return (bits || "").replace(/[^01]/g, "").slice(0, 32);
}

function decodeFromSegments(algorithm, bitsLen, segments) {
    if (!algorithm || !segments || segments.length === 0) {
        return { recoveredBits: "", valid: false, note: "No encoded segments." };
    }

    const bitResult = new Uint8Array(bitsLen);
    let valid = true;

    // Standard ASCII: 48 = '0', 49 = '1'
    if (algorithm === "NRZ-L") {
        for (let i = 0; i < bitsLen; i++) {
            bitResult[i] = segments[i][0] > 0 ? 49 : 48;
        }
    }

    else if (algorithm === "NRZI") {
        let prev = -1;
        for (let i = 0; i < bitsLen; i++) {
            const cur = segments[i][0];
            bitResult[i] = cur !== prev ? 49 : 48;
            prev = cur;
        }
    }

    else if (algorithm === "Manchester") {
        for (let i = 0; i < bitsLen; i++) {
            const bitArr = segments[i];
            const a = bitArr[0];
            const b = bitArr[1];
            if (a < 0 && b > 0) bitResult[i] = 49;      // Low-to-High = 1
            else if (a > 0 && b < 0) bitResult[i] = 48; // High-to-Low = 0
            else { bitResult[i] = 63; valid = false; }  // '?'
        }
    }

    else if (algorithm === "Differential Manchester") {
        let prevEnd = 1; // Encoder starts at +1
        for (let i = 0; i < bitsLen; i++) {
            const bitArr = segments[i];
            const first = bitArr[0];
            const second = bitArr[1];
            // Transition at the start of the interval means '0'
            bitResult[i] = first !== prevEnd ? 48 : 49;
            prevEnd = second;
        }
    }

    else if (algorithm === "Bipolar AMI") {
        for (let i = 0; i < bitsLen; i++) {
            bitResult[i] = segments[i][0] === 0 ? 48 : 49;
        }
    }

    else if (algorithm === "Pseudoternary") {
        for (let i = 0; i < bitsLen; i++) {
            bitResult[i] = segments[i][0] === 0 ? 49 : 48;
        }
    }

    const recoveredBits = String.fromCharCode(...bitResult);
    return { recoveredBits, valid, note: `${algorithm} decoded.` };
}

export function decode_dd_hp(algorithm, bitsInput) {
    const bits = sanitizeBits(bitsInput);
    const bitsLen = bits.length;

    // Use the optimized encoder that returns array-of-arrays
    const encoded = encode_hp(algorithm, bits);
    const decoded = decodeFromSegments(algorithm, bitsLen, encoded.segments);

    return {
        inputBits: bits,
        recoveredBits: decoded.recoveredBits,
        ok: decoded.recoveredBits === bits,
        valid: decoded.valid,
        note: decoded.note,
    };
}