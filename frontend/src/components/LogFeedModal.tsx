import React from "react";
import { X } from "lucide-react"; // X 아이콘 (닫기)을 Lucide React에서 가져옵니다.

// SystemNetworkMonitoring 컴포넌트의 LogEntry 인터페이스와 동일하게 정의
// 이 인터페이스는 실제 API 응답 구조에 맞춰야 합니다.
interface LogEntry {
    detected_at: string;
    attack_type: string | null; // 공격이 아닐 경우 null일 수 있음
    source_address: string | null;
    hostname: string | null;
    process_name: string | null;
}

// --- LogFeedModal 컴포넌트의 props 인터페이스 정의 ---
interface LogFeedModalProps {
    // 모달의 열림/닫힘 상태를 제어합니다. (true: 열림, false: 닫힘)
    isOpen: boolean;
    // 모달을 닫을 때 호출될 콜백 함수입니다.
    onClose: () => void;
    // 모달에 표시될 로그 피드 데이터 배열입니다. (LogEntry 타입 사용)
    logFeedData: LogEntry[]; // 이제 이 props를 사용합니다!
}

// --- 날짜 및 시간 포맷팅 유틸리티 함수 ---
// 주어진 날짜 문자열을 "yyyy.mm.dd 오전/오후 HH:MM" 형식으로 변환합니다.
const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    // 유효하지 않은 날짜인 경우 원본 문자열을 반환합니다.
    if (isNaN(date.getTime())) return dateStr;

    // 한국 지역화 포맷으로 표시 (오전/오후 포함, 초 제외)
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true // 오전/오후 형식
    });
};

// --- LogFeedModal 컴포넌트 정의 ---
// 실시간 로그 피드의 전체 내용을 보여주는 모달 컴포넌트입니다.
const LogFeedModal: React.FC<LogFeedModalProps> = ({ isOpen, onClose, logFeedData }) => {
    // `isOpen` prop이 false일 경우 모달을 렌더링하지 않습니다 (null 반환).
    if (!isOpen) return null;

    // --- 모달 UI 렌더링 ---
    return (
        <>
            {/* 모달 전체 컨테이너: 배경 오버레이 및 모달 박스 포함 */}
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            >
                {/* 모달 박스 본체 */}
                <div
                    role="dialog"
                    aria-modal="true"
                    className="relative w-full max-w-5xl max-h-[80vh] bg-white rounded-t-xl rounded-b-xl shadow-lg flex flex-col"
                    tabIndex={-1}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 모달 헤더 섹션 */}
                    <header className="sticky top-0 z-20 bg-white flex justify-between items-center border-b border-gray-200 px-6 py-4 rounded-t-xl">
                        {/* 모달 제목 */}
                        <h2 className="text-lg font-semibold flex-1 text-center">실시간 로그 피드 전체 보기</h2>
                        {/* 닫기 버튼 */}
                        <button
                            onClick={onClose}
                            aria-label="닫기"
                            className="p-1 rounded hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                        >
                            <X className="w-5 h-5" /> {/* 닫기 아이콘 */}
                        </button>
                    </header>

                    {/* 테이블 헤더 섹션 */}
                    <div className="grid grid-cols-5 gap-4 px-6 py-3 font-semibold border-b border-gray-200 sticky top-[56px] bg-white z-10 text-sm">
                        <div className="text-center">수집 시각</div>
                        <div className="text-center">공격 유형</div>
                        <div className="text-center">발생 IP</div>
                        <div className="text-center">호스트명</div>
                        <div className="text-center">프로세스명</div>
                    </div>

                    {/* 데이터 리스트 섹션: 실제 로그 데이터가 표시되는 스크롤 가능한 영역 */}
                    <div className="overflow-auto flex-1 px-6 py-3 text-sm text-gray-700">
                        {/* `logFeedData` 배열을 순회하며 각 로그 항목을 렌더링합니다. */}
                        {logFeedData.map((item, index) => (
                            <div
                                key={index}
                                className={`grid grid-cols-5 gap-4 py-2 border-b border-gray-100 cursor-default
                                    ${item.attack_type !== null ? "text-red-400 font-semibold" : "text-gray-600"}`}
                                title={`${formatDateTime(item.detected_at)} / ${item.attack_type || '-'} / ${item.source_address || '-'} / ${item.process_name || '-'} / ${item.hostname || '-'}`}
                            >
                                <div className="text-center">{formatDateTime(item.detected_at)}</div>
                                <div className="text-center">{item.attack_type || '-'}</div>
                                <div className="text-center">{item.source_address || '-'}</div>
                                <div className="text-center">{item.hostname || '-'}</div>
                                <div className="text-center">{item.process_name || '-'}</div>
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
            </div>
        </>
    );
};

export default LogFeedModal;