import React, { useRef, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface ChartProps {
  data: { time: string; value: number }[];
}

const SystemChart = ({ data }: ChartProps) => {
  const prevDataRef = useRef<{ time: string; value: number }[]>([]);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const prev = prevDataRef.current;

    const hasChanged =
      prev.length !== data.length ||
      prev.some((item, idx) => {
        const current = data[idx];
        return item.time !== current?.time || item.value !== current?.value;
      });

    if (hasChanged) {
      setAnimate(true);
      prevDataRef.current = data;
    } else {
      setAnimate(false);
    }
  }, [data]);

  return (
    <div
      className="bg-gray-50 p-4 rounded border border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300 transition focus:outline-none relative"
      tabIndex={-1}
    >
      <div className="flex items-center justify-between mb-2 pb-1">
        <div className="text-gray-600 font-semibold">시간대별 위협 발생 추이</div>
        <div className="text-gray-400 text-xs">최근 1시간 내 위협 발생 추이입니다.</div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={data}
          margin={{ left: -20, right: 25, top: 10, bottom: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="time" stroke="#999" tick={{ fontSize: 11 }} />
          <YAxis
            stroke="#999"
            domain={[0, 10]}
            ticks={[2, 4, 6, 8, 10]}
            tick={{ fontSize: 11 }}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#9fbff1ff"
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={animate}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(SystemChart);
