import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import { Link as LinkIcon, RefreshCw, Plug, PlugZap, } from "lucide-react";

import TrafficChart from "../components/TrafficChart"

// --- 상수 정의 ---

// API URL (환경 변수에서 가져옴)
const API_DATADB_URL = import.meta.env.VITE_API_DATADB_URL;
// 트래픽 오버 타임 API URL
const API_TRAFFIC_OVER_TIME_URL = `${API_DATADB_URL}/api/dashboard/traffic/traffic-over-time`; // API_DATADB_URL 사용
// 트래픽 스탯 API URL (총 패킷/바이트용)
const API_TRAFFIC_STATS_URL = `${API_DATADB_URL}/api/dashboard/traffic/stats`;
// 상위 포트 API URL
const API_TOP_PORTS_URL = `${API_DATADB_URL}/api/dashboard/traffic/top-ports?minutes=5`; // API_DATADB_URL 사용
// 공격 탐지 알림 API URL
const API_ATTACKS_URL = `${API_DATADB_URL}/api/dashboard/traffic/attacks`; // API_DATADB_URL 사용

// 포트 차트 상수
const PORT_BAR_HEIGHT = 30; // 각 포트 바의 높이 (px)
const PORT_CHART_PADDING_TOP_BOTTOM = 40; // 포트 차트의 상하 여백 (px)
const FIXED_BAR_CHART_WIDTH = 570; // 바 차트의 고정된 전체 너비 (px)

// --- 인터페이스 정의 ---
interface PortDataItem {
    port: string; // API에서 받아온 port 값을 그대로 사용할 것이므로 string 타입 유지
    value: number; // 포트별 카운트
}

// top-ports API 응답 데이터 구조
interface TopPortApiResponse {
    port: number | string; // API에서 port가 숫자 또는 문자열로 올 수 있음을 반영
    count: number;
}

// attacks API 응답 데이터 구조
interface AttackApiResponseItem {
    timestamp: string;
    src_ip: string;
    dst_port: number;
    protocol: number;
    flow_pkts_per_s: number;
    flow_byts_per_s: number;
}

interface AttackApiResponse {
    attacks_list: AttackApiResponseItem[];
    count_all_time: number;
}

// 컴포넌트에서 사용할 공격 알림 데이터 구조
interface AttackNotificationItem {
    time: string; // 수집 시간
    sourceIp: string; // 송신지 IP
    targetPort: string; // 대상 포트
    protocol: string; // 프로토콜
    packetsPerSecond: string; // 초당 패킷 수
    bytesPerSecond: string; // 초당 바이트
    severity: string; // 심각도 (API에 없으므로 임의로 Critical로 설정)
}

interface TrafficHistoryItem { // 실시간 트래픽 그래프를 위한 데이터 구조
    time: string;        // "hh:mm:ss" 형식의 시간 (X축)
    bytesPerSecond: number; // 초당 바이트 값 (Y축)
    packetsPerSecond: number; // 초당 패킷 값 (Y축)
}

// API 응답 데이터 구조 (traffic/stats)
interface TrafficStatsResponse {
    total_packets: number;
    total_bytes: number;
    last_second_packets: number;
    last_second_bytes: number;
    latest_data_timestamp: string;
}

// API 응답 데이터 구조 (traffic/traffic-over-time)
interface TrafficOverTimeResponse {
    timestamps: string[];
    packets_per_second: number[];
    bytes_per_second: number[];
}

// --- NetworkTrafficMonitoring 컴포넌트 정의 ---

const NetworkTrafficMonitoring: React.FC = () => {
    // --- 상태 관리 ---

    // 상위 목적지 포트 데이터 (API에서 받아올 것이므로 초기값은 빈 배열)
    const [portData, setPortData] = useState<PortDataItem[]>([]);

    // 실시간 공격 탐지 알림 데이터 (API에서 받아올 것이므로 초기값은 빈 배열)
    const [attackAlerts, setAttackAlerts] = useState<AttackNotificationItem[]>([]);

    // 시스템 연결 상태 (true: 연결 됨, false: 연결 끊김, null: 알 수 없음)
    const [isConnected, setIsConnected] = useState<boolean | null>(null);

    // API로부터 가져올 네트워크 통계 데이터 (traffic/stats에서 총량, traffic-over-time에서 초당 값)
    const [apiTotalPackets, setApiTotalPackets] = useState<number>(0);
    const [apiTotalBytes, setApiTotalBytes] = useState<number>(0);
    // 초당 값은 traffic-over-time API의 마지막 데이터를 사용
    const [apiLastSecondPackets, setApiLastSecondPackets] = useState<number>(0);
    const [apiLastSecondBytes, setApiLastSecondBytes] = useState<number>(0);

    // --- 실시간 트래픽 기록 (선 그래프용) ---
    // traffic-over-time API에서 받아온 모든 데이터를 저장. 이 배열의 크기를 10개로 유지합니다.
    const [trafficHistory, setTrafficHistory] = useState<TrafficHistoryItem[]>([]);

    // 그래프 토글 상태: 'bytes'(초당 바이트) 또는 'packets'(초당 흐름)
    const [graphType, setGraphType] = useState<'bytes' | 'packets'>('bytes');

    // --- 파생 상태 (useMemo) ---

    // 포트 데이터 개수에 따라 동적으로 차트 높이 계산 (Recharts의 height 속성)
    const calculatedPortChartHeight = useMemo(() => {
        // 최소 높이를 유지하면서, 실제 포트 데이터의 개수에 따라 높이 조절
        return Math.max(230, portData.length * PORT_BAR_HEIGHT + PORT_CHART_PADDING_TOP_BOTTOM);
    }, [portData.length]);


    // --- 유틸리티 함수 (`useCallback`으로 메모이제이션하여 성능 최적화) ---

    // 날짜 및 시간 포맷팅 (YYYY. MM. DD. 오전/오후 HH:MM:SS)
    const formatDateTime = useCallback((date: Date): string => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const ampm = hours >= 12 ? '오후' : '오전';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0시를 12시로 표시

        const pad = (num: number) => num.toString().padStart(2, '0'); // 두 자리 숫자로 패딩

        return `${year}. ${pad(month)}. ${pad(day)}. ${ampm} ${hours}:${pad(minutes)}:${pad(seconds)}`;
    }, []);

    // 시간만 포맷팅 (HH:MM:SS)
    const formatTimeOnly = useCallback((date: Date): string => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const pad = (num: number) => num.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }, []);

    // 바이트 값을 가장 적절한 단위(B, KB, MB, GB, TB)로 변환하는 함수
    // `includeUnit` 인자에 따라 단위 포함 여부를 제어
    // Y축 레이블에서는 단위를 생략하고, 툴팁에서는 단위를 포함하기 위함
    const bytesToLargestUnit = useCallback((bytes: number, includeUnit: boolean = true): string => {
        if (bytes === 0) return includeUnit ? "0 B" : "0"; // 값이 0일 때 Y축에서 표시하지 않음
        const units = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const value = (bytes / Math.pow(1024, i)).toFixed(1); // 소수점 첫째 자리까지 표시
        return includeUnit ? `${value} ${units[i]}` : value;
    }, []);

    // 프로토콜 번호를 이름으로 변환하는 함수
    const getProtocolName = useCallback((protocolNumber: number): string => {
        switch (protocolNumber) {
            case 1: return "ICMP";
            case 6: return "TCP";
            case 17: return "UDP";
            default: return String(protocolNumber);
        }
    }, []);

    // --- useEffect 훅: 데이터 업데이트 로직 (3초마다 API 호출) ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                // API URL이 설정되지 않았다면 오류를 기록하고 연결 끊김 상태로 전환
                if (!API_DATADB_URL) {
                    console.error("API_DATADB_URL이 .env 파일에 정의되지 않았습니다.");
                    setIsConnected(false);
                    return;
                }

                // 네 API를 동시에 호출 (Promise.allSettled 사용하여 하나라도 실패해도 다른 결과는 처리)
                const [statsResponse, overTimeResponse, topPortsResponse, attacksResponse] = await Promise.allSettled([
                    fetch(API_TRAFFIC_STATS_URL),
                    fetch(API_TRAFFIC_OVER_TIME_URL),
                    fetch(API_TOP_PORTS_URL),
                    fetch(API_ATTACKS_URL), // 공격 알림 API 추가
                ]);

                let anyApiConnected = false; // 하나라도 API 호출 성공 여부 판단용 플래그

                // traffic/stats API 처리 (총 패킷, 총 바이트)
                if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
                    const statsData: TrafficStatsResponse = await statsResponse.value.json();
                    setApiTotalPackets(statsData.total_packets);
                    setApiTotalBytes(statsData.total_bytes);
                    anyApiConnected = true;
                } else {
                    console.error("traffic/stats API 데이터 가져오기 오류:",
                        statsResponse.status === 'rejected' ? statsResponse.reason : `HTTP error! status: ${statsResponse.value?.status}`);
                    setApiTotalPackets(0);
                    setApiTotalBytes(0);
                }

                // traffic/traffic-over-time API 처리 (초당 값 및 그래프 데이터)
                if (overTimeResponse.status === 'fulfilled' && overTimeResponse.value.ok) {
                    const overTimeData: TrafficOverTimeResponse = await overTimeResponse.value.json();

                    const newTrafficHistory: TrafficHistoryItem[] = overTimeData.timestamps.map((ts, index) => ({
                        time: formatTimeOnly(new Date(ts)), // X축: 시간만 포맷
                        bytesPerSecond: overTimeData.bytes_per_second[index] || 0, // 값이 없을 경우 0 처리
                        packetsPerSecond: overTimeData.packets_per_second[index] || 0, // 값이 없을 경우 0 처리
                    }));
                    
                    setTrafficHistory(prevHistory => {
                        // 기존 데이터를 유지하면서 새 데이터를 추가하고, 가장 최근 9개 데이터만 슬라이스하여 반환
                        // API가 매번 1개의 새 데이터를 주는 경우를 가정하여 이전 8개 + 새 1개 = 총 9개
                        const combinedHistory = [...prevHistory, ...newTrafficHistory];
                        return combinedHistory.slice(-9); 
                    });

                    if (overTimeData.timestamps.length > 0) {
                        const lastIndex = overTimeData.timestamps.length - 1;
                        setApiLastSecondPackets(overTimeData.packets_per_second[lastIndex] || 0);
                        setApiLastSecondBytes(overTimeData.bytes_per_second[lastIndex] || 0);
                        anyApiConnected = true;
                    } else {
                        setApiLastSecondPackets(0);
                        setApiLastSecondBytes(0);
                    }
                } else {
                    console.error("traffic/traffic-over-time API 데이터 가져오기 오류:",
                        overTimeResponse.status === 'rejected' ? overTimeResponse.reason : `HTTP error! status: ${overTimeResponse.value?.status}`);
                    setApiLastSecondPackets(0);
                    setApiLastSecondBytes(0);
                    setTrafficHistory([]); // 그래프 데이터 초기화
                }

                // traffic/top-ports API 처리 (상위 목적지 포트)
                if (topPortsResponse.status === 'fulfilled' && topPortsResponse.value.ok) {
                    const topPortsData: TopPortApiResponse[] = await topPortsResponse.value.json();
                    
                    // API 응답 데이터를 PortDataItem 형식으로 변환 및 정렬
                    const transformedPortData: PortDataItem[] = topPortsData
                        .map(item => ({
                            // port 값을 그대로 사용, string으로 변환
                            port: String(item.port), 
                            value: item.count,
                        }))
                        .sort((a, b) => b.value - a.value); // 값(count) 기준으로 내림차순 정렬
                    
                    setPortData(transformedPortData);
                    anyApiConnected = true;
                } else {
                    console.error("traffic/top-ports API 데이터 가져오기 오류:",
                        topPortsResponse.status === 'rejected' ? topPortsResponse.reason : `HTTP error! status: ${topPortsResponse.value?.status}`);
                    setPortData([]); // API 실패 시 포트 데이터 초기화
                }

                // traffic/attacks API 처리 (공격 탐지 알림)
                if (attacksResponse.status === 'fulfilled' && attacksResponse.value.ok) {
                    const attacksData: AttackApiResponse = await attacksResponse.value.json();
                    const newAttackAlerts: AttackNotificationItem[] = attacksData.attacks_list.map(item => ({
                        time: formatDateTime(new Date(item.timestamp)),
                        sourceIp: item.src_ip,
                        targetPort: String(item.dst_port), // 포트 번호를 문자열로 변환
                        protocol: getProtocolName(item.protocol), // 프로토콜 번호를 이름으로 변환
                        packetsPerSecond: item.flow_pkts_per_s.toLocaleString('ko-KR'), // 초당 패킷 수 포맷
                        bytesPerSecond: bytesToLargestUnit(item.flow_byts_per_s, true), // 초당 바이트 자동 변환
                        severity: "Critical", // API에 severity가 없으므로 임의로 Critical 설정
                    }));
                    // 최신 5개 알림만 유지
                    setAttackAlerts(newAttackAlerts.slice(0, 5));
                    anyApiConnected = true;
                } else {
                    console.error("traffic/attacks API 데이터 가져오기 오류:",
                        attacksResponse.status === 'rejected' ? attacksResponse.reason : `HTTP error! status: ${attacksResponse.value?.status}`);
                    setAttackAlerts([]); // API 실패 시 공격 알림 초기화
                }

                // 모든 API 호출 결과에 따라 최종 연결 상태 업데이트
                setIsConnected(anyApiConnected);

            } catch (error) {
                console.error("API 호출 중 예상치 못한 오류 발생:", error);
                setIsConnected(false);
                // 모든 통계 값과 그래프 데이터, 포트 데이터, 공격 알림 초기화
                setApiTotalPackets(0);
                setApiTotalBytes(0);
                setApiLastSecondPackets(0);
                setApiLastSecondBytes(0);
                setTrafficHistory([]);
                setPortData([]);
                setAttackAlerts([]);
            }
        };

        // 컴포넌트 마운트 시 최초 데이터 가져오기 및 이후 3초마다 반복 호출
        fetchData();
        const interval = setInterval(fetchData, 3000);

        // 컴포넌트 언마운트 시 인터벌 클리어 (메모리 누수 방지)
        return () => clearInterval(interval);
    }, [formatDateTime, formatTimeOnly, bytesToLargestUnit, getProtocolName]);

    // --- 이벤트 핸들러 (`useCallback`으로 메모이제이션) ---

    // "새로고침" 버튼 클릭 시 모든 데이터 및 상태 초기화
    const handleRefresh = useCallback(() => {
        setApiTotalPackets(0);
        setApiTotalBytes(0);
        setApiLastSecondPackets(0);
        setApiLastSecondBytes(0);
        setPortData([]); // 포트 데이터 초기화
        setAttackAlerts([]); // 공격 알림 초기화
        setIsConnected(null); // 연결 상태 초기화
        setTrafficHistory([]); // 트래픽 기록 초기화
        setGraphType('bytes'); // 그래프 타입 초기화
    }, []);

    // 그래프 타입 토글 핸들러 ('bytes' <-> 'packets')
    const toggleGraphType = useCallback(() => {
        setGraphType(prevType => (prevType === 'bytes' ? 'packets' : 'bytes'));
    }, []);

    // 연결 상태에 따라 다른 아이콘 반환
    const getStatusIcon = useCallback(() => {
        if (isConnected === true) return <Plug className="w-4 h-4 mr-1" />;
        if (isConnected === false) return <PlugZap className="w-4 h-4 mr-1" />;
        return <LinkIcon className="w-4 h-4 mr-1" />;
    }, [isConnected]);

    // 연결 상태에 따라 다른 텍스트 반환
    const getStatusText = useCallback(() => {
        if (isConnected === true) return "연결 됨";
        if (isConnected === false) return "연결 끊김";
        return "연결 상태";
    }, [isConnected]);

    // --- 컴포넌트 렌더링 ---
    return (
        <div className="p-6 bg-white h-full flex flex-col">
            {/* 헤더 섹션: 제목 및 버튼 */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">실시간 네트워크 트래픽 모니터링 📈</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded px-3 py-2 h-9 shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4 mr-1" /> 새로고침
                    </button>
                    <button className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded px-3 py-2 h-9 shadow-sm">
                        {getStatusIcon()}
                        {getStatusText()}
                    </button>
                </div>
            </div>

            {/* 통계 카드 섹션 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                    // 총 흐름 (패킷): 한국어 콤마 포맷 적용 (traffic/stats API)
                    { label: "총 흐름", value: apiTotalPackets.toLocaleString('ko-KR'), unit: "개" }, 
                    // 총 바이트: 자동 단위 변환 적용 (traffic/stats API)
                    { label: "총 바이트", value: apiTotalBytes, isByte: true }, 
                    // 초당 흐름 (패킷): traffic-over-time API의 마지막 값
                    { label: "초당 흐름", value: apiLastSecondPackets, unit: "개/s" },
                    // 초당 바이트: traffic-over-time API의 마지막 값
                    { label: "초당 바이트", value: apiLastSecondBytes, isByte: true }, 
                ].map((card, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded border border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300 transition text-center">
                        <div className="text-sm text-gray-600">{card.label}</div>
                        <div className="font-bold mt-2 py-2 text-xl text-black">
                            {/* isByte 속성에 따라 바이트 변환 함수 사용 또는 일반 값/단위 표시 */}
                            {card.isByte ? bytesToLargestUnit(card.value as number) : `${card.value} ${card.unit}`}
                        </div>
                    </div>
                ))}
            </div>

            {/* 차트 섹션: 실시간 트래픽 그래프 및 상위 목적지 포트 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* 실시간 트래픽 그래프 */}
                <TrafficChart
                graphType={graphType}
                trafficHistory={trafficHistory}
                toggleGraphType={toggleGraphType}
                bytesToLargestUnit={bytesToLargestUnit}
                />

                {/* 상위 목적지 포트 바 차트 - 스크롤 및 동적 높이 적용 */}
                <div className="bg-gray-50 p-4 rounded border border-gray-200 shadow-md hover:shadow-lg transition focus:outline-none flex flex-col" tabIndex={-1}>
                    <div className="text-gray-600 font-semibold mb-2">상위 목적지 포트</div>
                    <div className={`max-h-[240px] overflow-y-auto w-full`}>
                        <BarChart
                            margin={{ top: 5, right: 30, left: -40, bottom: 0 }}
                            width={FIXED_BAR_CHART_WIDTH}
                            height={calculatedPortChartHeight}
                            data={portData}
                            layout="vertical"
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            {/* portData.port 값을 그대로 XAxis의 dataKey로 사용 */}
                            <XAxis type="number" hide domain={[0, 'auto']} /> 
                            {/* portData.port 값을 그대로 YAxis의 dataKey로 사용 */}
                            <YAxis dataKey="port" type="category" stroke="#999" width={90} /> 
                            <Tooltip formatter={(value: number) => value.toLocaleString('ko-KR')} /> {/* 툴팁에 콤마 포맷 적용 */}
                            <Bar dataKey="value" fill="#a388caff" barSize={PORT_BAR_HEIGHT - 10} /> {/* 바 스타일 */}
                        </BarChart>
                    </div>
                </div>
            </div>

            {/* 실시간 공격 탐지 알림 섹션 */}
            <div className="bg-gray-50 min-h-[230px] p-4 rounded border border-gray-200 shadow-md transition flex flex-col flex-grow overflow-hidden">
                <div className="text-gray-600 font-bold mb-2">실시간 공격 탐지 알림</div>
                <div className="grid grid-cols-6 text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
                    <div className="text-center">수집 시간</div>
                    <div className="text-center">송신지 IP</div>
                    <div className="text-center">대상 포트</div>
                    <div className="text-center">프로토콜</div>
                    <div className="text-center">초당 패킷 수</div>
                    <div className="text-center">초당 바이트</div>
                </div>
                <div className="overflow-y-auto mt-1 flex-grow">
                    {/* 공격 알림 데이터가 없을 때 표시하는 기본 메시지 */}
                    {attackAlerts.length === 0 ? (
                        <div className="grid grid-cols-6 text-sm text-gray-500 py-2">
                            <div className="text-center">-</div><div className="text-center">-</div><div className="text-center">-</div><div className="text-center">-</div><div className="text-center">-</div><div className="text-center">-</div>
                        </div>
                    ) : (
                        // 공격 알림 데이터가 있을 때 각 알림을 표시
                        attackAlerts.map((alert, index) => (
                            <div
                                key={index}
                                className={`grid grid-cols-6 gap-2 text-sm border-b border-gray-100 py-1.5 cursor-default ${
                                    alert.severity === "Critical" || alert.severity === "High" ? "text-red-400 font-semibold" : "text-gray-600"
                                }`}
                            >
                                <div className="text-center" title={alert.time}>{alert.time}</div>
                                <div className="text-center">{alert.sourceIp}</div>
                                <div className="text-center">{alert.targetPort}</div>
                                <div className="text-center">{alert.protocol}</div>
                                <div className="text-center">{alert.packetsPerSecond}</div>
                                <div className="text-center">{alert.bytesPerSecond}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default NetworkTrafficMonitoring;