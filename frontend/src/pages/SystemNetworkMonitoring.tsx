import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link as LinkIcon, Plug, PlugZap, RefreshCw } from "lucide-react"; // 아이콘 임포트
import LogFeedModal from "../components/LogFeedModal"; // 로그 상세 정보를 보여주는 모달 컴포넌트
import SystemChart from "../components/SystemChart"; // 차트 컴포넌트

// API URL (환경 변수에서 가져옴)
// .env 파일에 VITE_API_DATADB_URL=http://210.119.12.96:8000 와 같이 정의되어야 합니다.
const API_DATADB_URL = import.meta.env.VITE_API_DATADB_URL;

// 현재 시각을 기준으로 10분 단위의 시간 레이블을 생성하는 헬퍼 함수
const getCurrentTimeLabel = (baseDate?: Date): string => {
    const now = baseDate ?? new Date(); // 기본값은 현재 시간
    const minutes = Math.floor(now.getMinutes() / 10) * 10; // 분을 10분 단위로 반올림
    // 시간을 "HH:MM" 형식으로 포맷팅 (예: "14:30")
    return `${now.getHours().toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
};

// 차트 및 바 차트에 사용될 파스텔 색상 팔레트
const pastelColors: string[] = [
    "#CEDBD9", // 연한 민트
    "#FFCCBC", // 연한 오렌지
    "#D9D1D9", // 연한 보라
    "#D4EDDA", // 연한 녹색
    "#ADC3B8", // 회색빛 녹색
    "#FFF5CC", // 연한 노랑
    "#C3B1C5", // 보라빛 회색
    "#DDD7BD", // 베이지
    "#FFB3A7", // 연한 빨강
];

// 파이 차트 (여기서는 바 차트로 표현됨) 데이터 항목의 인터페이스 정의
interface PieDataItem {
    name: string; // 위협 유형 이름
    value: number; // 해당 위협 유형의 발생 횟수
}

// 로그 리스트 API 응답 데이터 구조 (개별 로그 항목)
interface LogEntry {
    detected_at: string;
    attack_type: string | null; // 공격이 아닐 경우 null일 수 있음
    source_address: string | null;
    hostname: string | null;
    process_name: string | null;
}

// 통계 API 응답 데이터 구조
interface LogStats {
    total_threats: number;
    top_threat_type: string;
    distribution: {
        type: string;
        count: number;
    }[];
    threat_type_count: number; // 추가: 통계 API에서 반환하는 총 위협 종류 수
}

// 24시간 로그 카운트 API 응답 데이터 구조
interface LogCount24h {
    log_count_24h: number;
}


// SystemNetworkMonitoring 컴포넌트 정의
const SystemNetworkMonitoring: React.FC = () => {
    // 시간대별 로그 데이터를 저장하는 상태. 초기값은 10분 간격의 0 값 데이터
    const [logData, setLogData] = useState<{ time: string; value: number }[]>([
        { time: "00:00", value: 0 },
        { time: "00:10", value: 0 },
        { time: "00:20", value: 0 },
        { time: "00:30", value: 0 },
        { time: "00:40", value: 0 },
        { time: "00:50", value: 0 },
    ]);

    // 위협 유형별 분포 데이터를 저장하는 상태. 초기값은 모든 위협 유형에 대해 0
    const [pieData, setPieData] = useState<PieDataItem[]>([
        { name: "DCOM 공격", value: 0 },
        { name: "DLL 하이재킹", value: 0 },
        { name: "WMI 공격", value: 0 },
        { name: "방어 회피", value: 0 },
        { name: "원격 서비스 공격 (일반)", value: 0 },
        { name: "원격 서비스 공격 (WinRM)", value: 0 },
        { name: "원격 서비스 악용", value: 0 },
        { name: "지속성 (계정 생성)", value: 0 },
        { name: "스케줄 작업 공격", value: 0 },
    ]);

    // 실시간 로그 피드 데이터를 저장하는 상태. API에서 받아올 것이므로 초기값은 빈 배열
    const [logFeedData, setLogFeedData] = useState<LogEntry[]>([]);

    // 총 탐지된 위협 수를 저장하는 상태
    const [totalDetectedThreats, setTotalDetectedThreats] = useState<number>(0);

    // 24시간 동안 수집된 로그 수를 저장하는 상태
    const [logCount24h, setLogCount24h] = useState<number>(0); // 새 상태 추가

    // 로그 피드 모달의 열림/닫힘 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    // 시스템 연결 상태 (true: 연결 됨, false: 연결 끊김, null: 알 수 없음)
    const [isConnected, setIsConnected] = useState<boolean | null>(null);

    // useMemo를 사용하여 pieData가 변경될 때만 최다 발생 위협 유형을 계산
    const mostFrequentThreat = useMemo(() => {
        const totalValue = pieData.reduce((acc, item) => acc + item.value, 0); // 전체 위협 발생 횟수
        if (pieData.length === 0 || totalValue === 0) {
            return "-"; // 데이터가 없거나 총 발생 횟수가 0이면 "-" 반환
        }
        // 가장 큰 value를 가진 위협 유형 찾기
        const maxThreat = pieData.reduce((prev, current) =>
            prev.value > current.value ? prev : current
        );
        if (maxThreat.value === 0) {
            return "-"; // 가장 많이 발생한 위협도 0이면 "-" 반환
        }
        return maxThreat.name; // 최다 발생 위협 유형 이름 반환
    }, [pieData]);

    // useMemo를 사용하여 pieData가 변경될 때만 탐지된 위협 종류 개수를 계산
    const detectedThreatTypesCount = useMemo(() => {
        const activeThreats = pieData.filter(item => item.value > 0); // value가 0보다 큰 위협만 필터링
        if (activeThreats.length === 0) {
            return 0; // 탐지된 위협이 없으면 숫자 0 반환 (Y축 계산을 위해)
        }
        return activeThreats.length; // 탐지된 위협 종류의 개수 반환 (숫자)
    }, [pieData]);

    // API URL 정의
    const API_LOGS_LIST_URL = `${API_DATADB_URL}/api/dashboard/logs/list?skip=0&limit=100`;
    const API_LOGS_STATS_URL = `${API_DATADB_URL}/api/dashboard/logs/stats`;
    const API_LOGS_COUNT_24H_URL = `${API_DATADB_URL}/api/dashboard/logs/count-24h`; // 새 API URL 추가

    // 모든 API 호출이 성공했는지 여부를 추적하는 변수 (컴포넌트 스코프)
    let allApiCallsSuccessful = true;

    // 실시간으로 자주 갱신되어야 하는 데이터 (상단 카드, 막대 그래프, 로그 피드)를 가져오는 함수
    const fetchRealtimeData = useCallback(async () => {
        try {
            if (!API_DATADB_URL) {
                console.error("API_DATADB_URL이 .env 파일에 정의되지 않았습니다.");
                setIsConnected(false);
                return;
            }

            allApiCallsSuccessful = true; // 매 호출마다 초기화

            // 1. 로그 리스트 데이터 가져오기 (실시간 로그 피드에 사용)
            const logListResponse = await fetch(API_LOGS_LIST_URL);
            if (!logListResponse.ok) {
                allApiCallsSuccessful = false;
                throw new Error(`logs/list HTTP error! status: ${logListResponse.status}`);
            }
            const logListData: LogEntry[] = await logListResponse.json();
            setLogFeedData(logListData.slice(0, 100)); // 최신 100개만 유지

            // 2. 로그 통계 데이터 가져오기 (총 탐지된 위협, 최다 발생 유형, 유형별 분포, 탐지된 위협 종류에 사용)
            const logStatsResponse = await fetch(API_LOGS_STATS_URL);
            if (!logStatsResponse.ok) {
                allApiCallsSuccessful = false;
                throw new Error(`logs/stats HTTP error! status: ${logStatsResponse.status}`);
            }
            const logStatsData: LogStats = await logStatsResponse.json();

            setTotalDetectedThreats(logStatsData.total_threats);

            setPieData(prevPieData => {
                const newPieDataMap = new Map(prevPieData.map(item => [item.name, { ...item, value: 0 }]));
                logStatsData.distribution.forEach(apiItem => {
                    newPieDataMap.set(apiItem.type, { name: apiItem.type, value: apiItem.count });
                });
                let updatedPieData = Array.from(newPieDataMap.values());
                updatedPieData.sort((a, b) => b.value - a.value);
                return updatedPieData;
            });

            // 3. 24시간 로그 카운트 데이터 가져오기
            const logCount24hResponse = await fetch(API_LOGS_COUNT_24H_URL);
            if (!logCount24hResponse.ok) {
                allApiCallsSuccessful = false;
                throw new Error(`logs/count-24h HTTP error! status: ${logCount24hResponse.status}`);
            }
            const logCount24hData: LogCount24h = await logCount24hResponse.json();
            setLogCount24h(logCount24hData.log_count_24h);

            setIsConnected(allApiCallsSuccessful);

        } catch (error) {
            console.error("실시간 데이터 가져오기 오류:", error);
            setIsConnected(false);
            // 오류 발생 시 데이터 초기화 (실시간 섹션에만 해당)
            setLogFeedData([]);
            setTotalDetectedThreats(0);
            setLogCount24h(0);
            setPieData([
                { name: "DCOM 공격", value: 0 }, { name: "DLL 하이재킹", value: 0 }, { name: "WMI 공격", value: 0 },
                { name: "방어 회피", value: 0 }, { name: "원격 서비스 공격 (일반)", value: 0 }, { name: "원격 서비스 공격 (WinRM)", value: 0 },
                { name: "원격 서비스 악용", value: 0 }, { name: "지속성 (계정 생성)", value: 0 }, { name: "스케줄 작업 공격", value: 0 },
            ]);
        }
    }, [API_LOGS_LIST_URL, API_LOGS_STATS_URL, API_LOGS_COUNT_24H_URL]); // 의존성 추가 (API URL 변경 시 다시 생성)

    // 라인 차트 데이터(10분 간격으로 갱신)를 가져오는 함수
    const fetchLineChartData = useCallback(async () => {
        try {
            if (!API_DATADB_URL) {
                console.error("API_DATADB_URL이 .env 파일에 정의되지 않았습니다.");
                return; // 연결 상태는 fetchRealtimeData에서 관리하므로 여기서는 반환
            }

            const logStatsResponse = await fetch(API_LOGS_STATS_URL);
            if (!logStatsResponse.ok) {
                throw new Error(`logs/stats HTTP error! status: ${logStatsResponse.status}`);
            }
            const logStatsData: LogStats = await logStatsResponse.json();

            const now = new Date();
            const updatedLogData = Array.from({ length: 6 }).map((_, i) => {
                const date = new Date(now.getTime() - (5 - i) * 10 * 60 * 1000);
                return {
                    time: getCurrentTimeLabel(date),
                    value: logStatsData.threat_type_count, // threat_type_count 값 사용
                };
            });
            setLogData(updatedLogData);

        } catch (error) {
            console.error("라인 차트 데이터 가져오기 오류:", error);
            // 오류 발생 시 라인 차트 데이터 초기화
            const now = new Date();
            setLogData(Array.from({ length: 6 }).map((_, i) => {
                const date = new Date(now.getTime() - (5 - i) * 10 * 60 * 1000);
                return { time: getCurrentTimeLabel(date), value: 0 };
            }));
        }
    }, [API_LOGS_STATS_URL]); // 의존성 추가 (API URL 변경 시 다시 생성)

    // 5초마다 실시간 데이터 갱신
    useEffect(() => {
        fetchRealtimeData(); // 컴포넌트 마운트 시 최초 데이터 가져오기
        const realtimeInterval = setInterval(fetchRealtimeData, 5000); // 5초마다 반복 호출

        return () => clearInterval(realtimeInterval); // 컴포넌트 언마운트 시 인터벌 정리
    }, [fetchRealtimeData]); // fetchRealtimeData가 변경될 때 다시 실행

    // 10분마다 라인 차트 데이터 갱신
    useEffect(() => {
        fetchLineChartData(); // 컴포넌트 마운트 시 최초 데이터 가져오기
        const lineChartInterval = setInterval(fetchLineChartData, 10 * 60 * 1000); // 10분마다 반복 호출

        return () => clearInterval(lineChartInterval); // 컴포넌트 언마운트 시 인터벌 정리
    }, [fetchLineChartData]); // fetchLineChartData가 변경될 때 다시 실행


    // "새로고침" 버튼 클릭 시 호출되는 핸들러 (useCallback으로 메모이제이션)
    const handleRefresh = useCallback(() => {
        // 모든 상태를 초기값으로 재설정하여 API 재호출 유도
        setTotalDetectedThreats(0);
        setLogCount24h(0);
        setPieData([
            { name: "DCOM 공격", value: 0 }, { name: "DLL 하이재킹", value: 0 }, { name: "WMI 공격", value: 0 },
            { name: "방어 회피", value: 0 }, { name: "원격 서비스 공격 (일반)", value: 0 }, { name: "원격 서비스 공격 (WinRM)", value: 0 },
            { name: "원격 서비스 악용", value: 0 }, { name: "지속성 (계정 생성)", value: 0 }, { name: "스케줄 작업 공격", value: 0 },
        ]);
        setLogFeedData([]);
        setLogData(Array.from({ length: 6 }).map((_, i) => {
            const date = new Date(new Date().getTime() - (5 - i) * 10 * 60 * 1000);
            return { time: getCurrentTimeLabel(date), value: 0 };
        }));
        setIsConnected(null); // 연결 상태 초기화

        // 모든 데이터 패치를 강제로 재시작
        fetchRealtimeData();
        fetchLineChartData();

    }, [fetchRealtimeData, fetchLineChartData]); // 의존성 추가


    // 연결 상태에 따라 다른 아이콘을 반환하는 함수 (useCallback으로 메모이제이션)
    const getStatusIcon = useCallback(() => {
        if (isConnected === true) return <Plug className="w-4 h-4 mr-1" />; // 연결 됨
        if (isConnected === false) return <PlugZap className="w-4 h-4 mr-1" />; // 연결 끊김
        return <LinkIcon className="w-4 h-4 mr-1" />; // 기본 (알 수 없음)
    }, [isConnected]);

    // 연결 상태에 따라 다른 텍스트를 반환하는 함수 (useCallback으로 메모이제이션)
    const getStatusText = useCallback(() => {
        if (isConnected === true) return "연결 됨";
        if (isConnected === false) return "연결 끊김";
        return "연결 상태"; // 기본 (알 수 없음)
    }, [isConnected]);

    // 각 위협 유형에 대한 설명을 담고 있는 객체
    const threatDescriptions: { [key: string]: string } = {
        "DCOM 공격": "DCOM 취약점을 이용한 공격입니다.",
        "DLL 하이재킹": "정상 DLL을 교체하여 악성 코드를 실행시키는 기법입니다.",
        "WMI 공격": "WMI를 이용한 원격 명령 실행 또는 정보 수집입니다.",
        "방어 회피": "탐지 우회를 위한 다양한 기술입니다.",
        "원격 서비스 공격 (일반)": "RDP 등 일반 원격 서비스를 악용하는 공격입니다.",
        "원격 서비스 공격 (WinRM)": "WinRM을 활용하여 원격 명령을 실행하는 공격입니다.",
        "원격 서비스 악용": "기존 원격 서비스를 악용하는 행위입니다.",
        "지속성 (계정 생성)": "계정 생성을 통해 시스템 지속 접근을 시도하는 공격입니다.",
        "스케줄 작업 공격": "스케줄러 등록을 통해 악성코드를 실행하는 공격입니다.",
        // API에서 올 수 있는 다른 공격 유형에 대한 설명 추가 가능
    };

    const FIXED_BAR_CHART_WIDTH = 570; // 바 차트의 고정된 전체 너비 (px)
    const MIN_BAR_WIDTH_PX = 2; // 각 바의 최소 너비

    // 전체 너비를 기준으로 각 바의 픽셀 너비를 계산하고 반올림 오차를 조정하는 함수
    const calculateFinalWidths = useMemo(() => {
        return (data: PieDataItem[], totalContainerPixels: number): number[] => {
            if (data.length === 0) {
                return [];
            }

            const totalValue = data.reduce((sum, item) => sum + item.value, 0);
            let calculatedWidths: number[] = new Array(data.length).fill(0);

            if (totalValue === 0) {
                // 모든 값이 0인 경우, 모든 바에 MIN_BAR_WIDTH_PX 할당
                calculatedWidths = data.map(() => MIN_BAR_WIDTH_PX);
            } else {
                // 값이 있는 경우 비율에 따라 너비 계산
                let rawPixels = data.map(item => (item.value / totalValue) * totalContainerPixels);

                // 각 바에 MIN_BAR_WIDTH_PX를 적용하면서 비율 계산
                calculatedWidths = rawPixels.map(px => Math.max(MIN_BAR_WIDTH_PX, Math.round(px)));
            }

            // 전체 바의 현재 합계와 목표 너비 비교하여 오차 조정
            let currentSum = calculatedWidths.reduce((acc, width) => acc + width, 0);
            let difference = totalContainerPixels - currentSum;

            // 오차 분배를 위해 원시 픽셀 값에 따라 정렬된 인덱스 목록 (값이 큰 순서대로 오차 분배)
            // 주의: totalValue가 0일 경우 rawPixels가 모두 0이므로, 이때는 원래 인덱스 순서대로 정렬 (의미 없지만 안전하게)
            let sortedIndices = data
                .map((item, index) => ({ value: item.value, index: index }))
                .sort((a, b) => b.value - a.value);


            // 차이만큼 픽셀 조정 (양수이면 더하고, 음수이면 뺌)
            // MIN_BAR_WIDTH_PX보다 작아지지 않도록 주의
            const numAdjustments = Math.abs(difference);
            for (let i = 0; i < numAdjustments; i++) {
                const targetIndex = sortedIndices[i % sortedIndices.length].index;
                if (difference > 0) { // 너비가 부족하면 추가
                    calculatedWidths[targetIndex]++;
                } else { // 너비가 초과하면 감소
                    calculatedWidths[targetIndex] = Math.max(MIN_BAR_WIDTH_PX, calculatedWidths[targetIndex] - 1);
                }
            }

            // 최종적으로 음수 값이 생기지 않도록 다시 한번 확인
            return calculatedWidths.map(px => Math.max(0, px));
        };
    }, []); // 의존성 없음, 함수 자체는 고정

    // 실제 바 너비를 계산
    const finalBarPixelWidths = calculateFinalWidths(pieData, FIXED_BAR_CHART_WIDTH);

    // 컴포넌트 렌더링
    return (
        <div className="p-6 bg-white h-full flex flex-col">
            {/* 헤더 섹션: 제목 및 버튼 */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-gray-800">
                    시스템 로그 실시간 모니터링 📈
                </h1>
                <div className="flex gap-2">
                    {/* 새로고침 버튼 */}
                    <button
                        onClick={handleRefresh}
                        className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded px-3 py-2 h-9 shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        새로고침
                    </button>
                    {/* 연결 상태 버튼 */}
                    <button className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded px-3 py-2 h-9 shadow-sm">
                        {getStatusIcon()} {/* 연결 상태에 따른 아이콘 */}
                        {getStatusText()} {/* 연결 상태에 따른 텍스트 */}
                    </button>
                </div>
            </div>

            {/* 통계 카드 섹션 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                    // logCount24h 상태를 사용하여 24시간 로그 수를 표시
                    { label: "수집된 로그 수 (24H)", value: `${logCount24h.toLocaleString()} 개`, valueClass: "text-black text-xl" },
                    { label: "총 탐지된 위협", value: totalDetectedThreats.toLocaleString(), valueClass: "text-red-400 text-2xl" }, // toLocaleString() 적용
                    { label: "최다 발생 위협 유형", value: mostFrequentThreat, valueClass: "text-black text-lg" },
                    { label: "탐지된 위협 종류", value: `${detectedThreatTypesCount}건`, valueClass: "text-black text-lg" },
                ].map((card, idx) => (
                    <div
                        key={idx}
                        className="bg-gray-50 p-4 rounded border border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300 transition text-center"
                    >
                        <div className="text-sm text-gray-600">{card.label}</div>
                        <div className={`font-bold mt-2 py-2 ${card.valueClass}`}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* 차트 섹션: 시간대별 위협 발생 추이 및 위협 유형별 분포 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* 시간대별 위협 발생 추이 라인 차트 */}
                <SystemChart data={logData} />

                {/* 위협 유형별 분포 바 차트 및 설명 */}
                <div className="bg-gray-50 p-4 rounded border border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300 transition focus:outline-none flex flex-col" tabIndex={-1}>
                    <div className="mt-[1px] text-gray-600 font-semibold leading-tight">위협 유형별 분포</div>
                    {/* 실제 바 차트 렌더링 영역 */}
                    <div
                        className="h-[30px] w-[570px] rounded overflow-hidden mt-5 flex"
                    >
                        {pieData.map((item, index) => {
                            const pixelWidth = finalBarPixelWidths[index]; // 계산된 최종 픽셀 너비
                            // 바의 title 속성에 마우스 오버 시 표시될 정보 설정
                            const barTitle = item.value === 0 ? `${item.name}: 데이터 없음` : `${item.name}: ${item.value}`;
                            return (
                                <div
                                    key={item.name}
                                    style={{
                                        width: `${pixelWidth}px`, // 각 바의 너비
                                        backgroundColor: item.value === 0 ? "#E0E0E0" : pastelColors[index % pastelColors.length], // 값이 0이면 회색, 아니면 파스텔 색상
                                        flexShrink: 0, // flex 아이템이 줄어들지 않도록
                                        transition: 'width 0.5s ease-out, background-color 0.5s ease-out', // 부드러운 전환 효과
                                    }}
                                    title={barTitle} // 마우스 오버 시 툴팁 텍스트
                                />
                            );
                        })}
                    </div>
                    {/* 위협 유형별 설명 목록 */}
                    <div className="mt-6 text-sm text-gray-700 space-y-2 border border-gray-200 p-3 rounded overflow-y-auto" style={{ maxHeight: '180px' }}> {/* 높이 고정 및 스크롤 바 유지 */}
                        {pieData.map((item, idx) => (
                            <div key={item.name} className="flex items-start gap-2">
                                {/* 색상 인디케이터 (바 차트 색상과 동일) */}
                                <div
                                    className="w-3 h-3 mt-1 rounded-sm shrink-0"
                                    style={{ backgroundColor: item.value === 0 ? "#E0E0E0" : pastelColors[idx % pastelColors.length] }}
                                />
                                <div>
                                    <span className="font-semibold">{item.name}</span>:{" "}
                                    {item.value === 0 ? (
                                        <span className="text-gray-500">탐지된 위협 데이터가 없습니다.</span>
                                    ) : (
                                        threatDescriptions[item.name] ?? "설명이 없습니다." // 위협 설명 표시
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 실시간 로그 피드 섹션 */}
            <div className="bg-gray-50 min-h-[230px] p-4 rounded border border-gray-200 shadow-md transition flex flex-col flex-grow overflow-hidden">
                <div className="shrink-0 flex items-center justify-between">
                    <div className="text-gray-600 font-semibold mb-2 pl-1">실시간 로그 피드</div>
                    {/* 로그 전체 보기 버튼 */}
                    <button className="text-xs text-gray-600 underline mb-2 mr-1" type="button" onClick={() => setIsModalOpen(true)}>
                        로그 전체 보기
                    </button>
                </div>
                {/* 로그 피드 테이블 헤더 */}
                <div className="grid grid-cols-5 mt-1 gap-2 text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
                    <div className="text-center">수집 시각</div>
                    <div className="text-center">공격 유형</div>
                    <div className="text-center">발생 IP</div>
                    <div className="text-center">호스트명</div>
                    <div className="text-center">프로세스명</div>
                </div>
                {/* 로그 피드 데이터 목록 */}
                <div className="overflow-y-auto mt-1 flex-grow">
                    {logFeedData.slice(0, 7).map((item, index) => ( // 최신 7개 로그만 표시
                        <div
                            key={index}
                            className={`grid grid-cols-5 gap-2 text-sm border-b border-gray-100 py-1.5 cursor-default ${
                                // attack_type이 null이 아니면 "위협"으로 간주
                                item.attack_type !== null ? "text-red-400 font-semibold" : "text-gray-600"
                            }`}
                        >
                            {/* detected_at을 Date 객체로 변환하여 한국 지역화 포맷으로 표시 (오전/오후 포함) */}
                            <div className="text-center" title={item.detected_at}>
                                {new Date(item.detected_at).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    // second: '2-digit', // 초는 제외
                                    hour12: true // 오전/오후 형식
                                })}
                            </div>
                            <div className="text-center">{item.attack_type || '-'}</div> {/* attack_type이 null이면 '-' 표시 */}
                            <div className="text-center">{item.source_address || '-'}</div> {/* source_address가 null이면 '-' 표시 */}
                            <div className="text-center">{item.hostname || '-'}</div> {/* hostname이 null이면 '-' 표시 */}
                            <div className="text-center">{item.process_name || '-'}</div> {/* process_name이 null이면 '-' 표시 */}
                        </div>
                    ))}
                    {/* 로그 데이터가 없을 경우 메시지 */}
                    {logFeedData.length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                            로그 데이터가 없습니다.
                        </div>
                    )}
                </div>
            </div>

            {/* 로그 피드 상세보기 모달 컴포넌트 */}
            <LogFeedModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} logFeedData={logFeedData} />
        </div>
    );
};

export default SystemNetworkMonitoring;