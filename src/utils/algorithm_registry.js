// This file serves as the central point for selecting algorithm implementations.

// Import ORIGINAL (User)
import * as EncoderUser from "../encoding/digital_to_digital_encoder";
import * as ModulatorUser from "../encoding/digital_to_analog_modulator";
import * as ADCUser from "../encoding/analog_to_digital_encoding";
import * as A2AModUser from "../encoding/analog_to_analog_modulator";

import * as DecoderUser from "../decoding/digital_to_digital_decoder";
import * as ADCReconUser from "../decoding/analog_to_digital_decoding"; // A2D reconstruction
import * as DemodUser from "../decoding/digital_to_analog_demodulator"; // exports demodulate_da
import * as A2ADemodUser from "../decoding/analog_to_analog_demodulator";

// Import AI 1 (Optimized)
import * as EncoderAI1 from "../encoder_ai1/digital_to_digital_encoder_optimized";
import * as ModulatorAI1 from "../encoder_ai1/digital_to_analog_modulator_optimized";
import * as ADCAI1 from "../encoder_ai1/analog_to_digital_encoding_optimized";
import * as A2AModAI1 from "../encoder_ai1/analog_to_analog_modulator_optimized";

import * as DecoderAI1 from "../decoder_ai1/digital_to_digital_decoder_optimized";
import * as ADCReconAI1 from "../decoder_ai1/analog_to_digital_decoding_optimized";
import * as DemodAI1 from "../decoder_ai1/digital_to_analog_demodulator_optimized";
import * as A2ADemodAI1 from "../decoder_ai1/analog_to_analog_demodulator_optimized";

// Import AI 2 (High Performance - Placeholders)
import * as EncoderAI2 from "../encoder_ai2/digital_to_digital_encoder_hp";
import * as ModulatorAI2 from "../encoder_ai2/digital_to_analog_modulator_hp";
import * as ADCAI2 from "../encoder_ai2/analog_to_digital_encoding_hp";
import * as A2AModAI2 from "../encoder_ai2/analog_to_analog_modulator_hp";

import * as DecoderAI2 from "../decoder_ai2/digital_to_digital_decoder_hp";
import * as ADCReconAI2 from "../decoder_ai2/analog_to_digital_decoding_hp";
import * as DemodAI2 from "../decoder_ai2/digital_to_analog_demodulator_hp";
import * as A2ADemodAI2 from "../decoder_ai2/analog_to_analog_demodulator_hp";

export const IMPLEMENTATIONS = {
    user: "User Code",
    ai1: "AI Optimized (Lv 1)",
    ai2: "AI High Perf (Lv 2)",
};

// --- Encoders ---

export function getDigitalEncoder(impl) {
    if (impl === "ai1") return EncoderAI1.encode_optimized;
    if (impl === "ai2") return EncoderAI2.encode_hp;
    return EncoderUser.encode_original;
}

export function getDigitalModulator(impl) {
    if (impl === "ai1") return ModulatorAI1.modulate_optimized;
    if (impl === "ai2") return ModulatorAI2.modulate_hp;
    return ModulatorUser.modulate_original;
}

export function getADC(impl) {
    if (impl === "ai1") return { pcm: ADCAI1.adc_pcm_opt, delta: ADCAI1.adc_delta_opt };
    if (impl === "ai2") return { pcm: ADCAI2.adc_pcm_hp, delta: ADCAI2.adc_delta_hp };
    return { pcm: ADCUser.adc_pcm, delta: ADCUser.adc_delta };
}

export function getAnalogModulator(impl) {
    if (impl === "ai1") return A2AModAI1.modulate_aa_optimized;
    if (impl === "ai2") return A2AModAI2.modulate_aa_hp;
    return A2AModUser.modulate_aa;
}

// --- Decoders ---

export function getDigitalDecoder(impl) {
    if (impl === "ai1") return DecoderAI1.decode_dd_optimized;
    if (impl === "ai2") return DecoderAI2.decode_dd_hp;
    return DecoderUser.decode_dd;
}

export function getADCRecon(impl) {
    if (impl === "ai1") return { pcm: ADCReconAI1.reconstruct_pcm_opt, delta: ADCReconAI1.reconstruct_delta_opt };
    if (impl === "ai2") return { pcm: ADCReconAI2.reconstruct_pcm_hp, delta: ADCReconAI2.reconstruct_delta_hp };
    return { pcm: ADCReconUser.reconstruct_pcm_from_bits, delta: ADCReconUser.reconstruct_delta_from_bits };
}

export function getDigitalDemodulator(impl) {
    if (impl === "ai1") return DemodAI1.demodulate_optimized;
    if (impl === "ai2") return DemodAI2.demodulate_hp;
    return DemodUser.demodulate_da;
}

export function getAnalogDemodulator(impl) {
    if (impl === "ai1") return A2ADemodAI1.demodulate_aa_optimized;
    if (impl === "ai2") return A2ADemodAI2.demodulate_aa_hp;
    return A2ADemodUser.demodulate_aa;
}
