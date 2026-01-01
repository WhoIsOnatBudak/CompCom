import WaveformCanvas from "../WaveformCanvas/WaveformCanvas";
import AnalogModCanvas from "../AnalogModCanvas/AnalogModCanvas";
import ReceiverPanel from "../ReceiverPanel/ReceiverPanel";
import A2DCanvas from "../A2DCanvas/A2DCanvas";
import A2DOutput from "../A2DOutput/A2DOutput";
import A2DReconCanvas from "../A2DReconCanvas/A2DReconCanvas";



import "./RightPanel.css";

export default function RightPanel({ selection }) {
  const { category, algorithm, data } = selection;

  const isD2A = category === "Digital → Analog";
  const isA2D = category === "Analog → Digital";

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
