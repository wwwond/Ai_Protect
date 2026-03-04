// src/components/TrafficChart.tsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Repeat } from "lucide-react";

// 바이트 값 단위 변환 유틸 (외부에서 전달받음)
type UnitFormatter = (value: number, includeUnit?: boolean) => string;

// 그래프 타입
type GraphType = "bytes" | "packets";

// 실시간 데이터 포맷
interface TrafficHistoryItem {
  time: string;
  bytesPerSecond: number;
  packetsPerSecond: number;
}

interface TrafficChartProps {
  graphType: GraphType;
  trafficHistory: TrafficHistoryItem[];
  toggleGraphType: () => void;
  bytesToLargestUnit: UnitFormatter;
}

const TrafficChart: React.FC<TrafficChartProps> = ({
  graphType,
  trafficHistory,
  toggleGraphType,
  bytesToLargestUnit,
}) => {
  return (
    <div
      className="bg-gray-50 p-4 rounded border border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300 transition flex flex-col"
      tabIndex={-1}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="text-gray-600 font-semibold">
          실시간 초당 트래픽 ({graphType === "bytes" ? "바이트 (단위 자동)" : "흐름 (개/s)"})
        </div>
        <button
          onClick={toggleGraphType}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-sm flex items-center shadow-sm"
        >
          <Repeat className="w-3 h-3 mr-1" />
          전환
        </button>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={trafficHistory}
          margin={{ top: 5, right: 30, left: -5, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis
            domain={[0, "auto"]}
            tickFormatter={(value: number) =>
              graphType === "bytes"
                ? bytesToLargestUnit(value, false)
                : value === 0
                  ? ""
                  : value.toLocaleString("ko-KR")
            }
          />
          <Tooltip
            formatter={(value: number) =>
              graphType === "bytes"
                ? bytesToLargestUnit(value, true)
                : `${value.toLocaleString("ko-KR")} 개/s`
            }
          />
          <Line
            type="monotone"
            dataKey={graphType === "bytes" ? "bytesPerSecond" : "packetsPerSecond"}
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrafficChart;
