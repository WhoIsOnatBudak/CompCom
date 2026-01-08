import "./MetricDisplay.css";

export default function MetricDisplay({ metrics }) {
    if (!metrics) return null;

    return (
        <div className="metricCard">
            <div className="metricTitle">Benchmarks ({metrics.calls} iter)</div>

            <div className="metricRow">
                <span className="mLbl">Total Time:</span>
                <span className="mVal">{(metrics.totalTime || 0).toFixed(2)} ms</span>
            </div>

            <div className="metricRow">
                <span className="mLbl">Avg Time:</span>
                <span className="mVal">{(metrics.avgTime || 0).toFixed(4)} ms</span>
            </div>

            <div className="metricRow">
                <span className="mLbl">Heap Used:</span>
                {metrics.memUsed !== null ? (
                    <span className="mVal">
                        {Number(metrics.memUsed).toFixed(2)} MB
                    </span>
                ) : (
                    <span className="mVal">-</span>
                )}
            </div>

            <div className="metricNote">
                * Running {metrics.calls} iterations per update.
            </div>
        </div>
    );
}
