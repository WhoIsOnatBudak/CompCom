export function runBenchmark(fn, iterations = 1000) {
    const t0 = performance.now();

    // Memory check (Chrome only usually)
    // Returns undefined if API not available
    const hasMem = !!(performance && performance.memory);
    const memStart = hasMem ? performance.memory.usedJSHeapSize : 0;

    for (let i = 0; i < iterations; i++) {
        fn();
    }

    const t1 = performance.now();
    const memEnd = hasMem ? performance.memory.usedJSHeapSize : 0;

    let memDelta = null; // Default to null (not supported or unknown)

    if (hasMem) {
        // Convert to MB
        memDelta = (memEnd - memStart) / 1024;
    }

    const totalTime = t1 - t0;
    const avgTime = totalTime / iterations;

    return {
        totalTime, // ms
        avgTime,   // ms
        calls: iterations,
        memDelta: memDelta, // MB or null
        memUsed: hasMem ? (memEnd / 1024 / 1024) : null // MB
    };
}
