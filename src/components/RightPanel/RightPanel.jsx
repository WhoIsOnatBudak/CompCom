import WaveformCanvas from "../WaveformCanvas/WaveformCanvas";
import AnalogModCanvas from "../AnalogModCanvas/AnalogModCanvas";
import ReceiverPanel from "../ReceiverPanel/ReceiverPanel";
import A2DCanvas from "../A2DCanvas/A2DCanvas";
import A2DOutput from "../A2DOutput/A2DOutput";
import A2DReconCanvas from "../A2DReconCanvas/A2DReconCanvas";
import A2ACanvas from "../A2ACanvas/A2ACanvas";
import A2ADemodCanvas from "../A2ADemodCanvas/A2ADemodCanvas";




import "./RightPanel.css";

export default function RightPanel({ selection }) {
  const { category, algorithm, data } = selection;

  const isD2A = category === "Digital → Analog";
  const isA2D = category === "Analog → Digital";
  const isA2A = category === "Analog → Analog";

  return (
    <div className="rightPanel">
      <div className="rightHeader">
        <div><b>Category:</b> {category || "-"}</div>
        <div><b>Algorithm:</b> {algorithm || "-"}</div>
        <div><b>Data:</b> {data || "-"}</div>
      </div>

      <div className="rightBody">
            {isA2D ? (
              <>
                <A2DCanvas analog={selection.analog} />
                <A2DOutput algorithm={algorithm} analog={selection.analog} />
                <A2DReconCanvas algorithm={algorithm} analog={selection.analog} />
              </>
            ) : isD2A ? (
              <>
                <AnalogModCanvas algorithm={algorithm} data={data} />
                <ReceiverPanel category={category} algorithm={algorithm} data={data} />
              </>
            ) : isA2A ? (
              <>
                <A2DCanvas analog={selection.analog} />   {/* x(t) aynı analog çizim reuse */}
                <A2ACanvas algorithm={algorithm} analog={selection.analog} /> {/* y(t) */}
                <A2ADemodCanvas algorithm={algorithm} analog={selection.analog} />
              </>
            ) : (
              <>
                <WaveformCanvas algorithm={algorithm} data={data} />
                <ReceiverPanel category={category} algorithm={algorithm} data={data} />
              </>
            )}
      </div>
    </div>
  );
}
