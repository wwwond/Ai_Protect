// src/components/SecurityPolicyModal.tsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react'; // 닫기 아이콘을 위해 lucide-react의 X 아이콘 import

interface SecurityPolicyModalProps {
    onClose: () => void;
}

const SecurityPolicyModal: React.FC<SecurityPolicyModalProps> = ({ onClose }) => {
    // ESC 키 입력 시 모달 닫기
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    return (
        // 모달 바깥 클릭 시 모달 닫기 (onClick={onClose} 추가)
        // z-index를 z-[9999]로 설정하여 가장 위에 오도록 함
        <div
            className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={onClose}
        >
            {/* 모달 콘텐츠 내부 클릭 시 이벤트 전파 중지 (onClick={(e) => e.stopPropagation()} 추가) */}
            <div
                className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 고정: 제목과 닫기 버튼을 별도의 div로 묶고 sticky 적용 */}
                <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">AI 기반 보안 시스템 통합 보안 정책</h2>
                    {/* 닫기 아이콘 변경 */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 내용 스크롤: overflow-y-auto 적용 */}
                <div className="p-6 pt-1 overflow-y-auto flex-grow space-y-4 text-gray-700 text-sm">
                    {/* 1. 정책 개요 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">1. 정책 개요</h3>
                    <p className="ml-4"><strong>1.1 목적</strong><br />본 정책은 AI기반 보안 시스템 (이하 "본 시스템")의 기밀성, 무결성, 가용성 확보 및 안전한 서비스 제공을 위한 관리적, 기술적, 물리적 보안 기준을 정의한다.</p>
                    <p className="ml-4"><strong>1.2 적용범위</strong><br />본 정책은 본 시스템의 네트워크, 로그, 데이터 베이스, 어플리케이션, 사용자, 운영 인력 등 전 구성 요소에 적용됩니다.</p>

                    {/* 2. 보안 조직 및 책임 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">2. 보안 조직 및 책임</h3>
                    <ul className="list-disc ml-8 space-y-1">
                        <li><strong>보안 총괄 책임자:</strong> 전사 보안 정책 수립, 검토, 교육 이행의 책임을 따름.</li>
                        <li><strong>관제 팀:</strong> 정책 집행, 모니터링, 사고 대응, 교육, 취약점 점검</li>
                        <li><strong>소프트웨어 팀:</strong> 관리팀에 의한 실질적인 해킹 대응팀</li>
                        <li><strong>각 부서:</strong> 역할별 보안책임자 지정, 정책 준수 및 자산 관리 책임</li>
                    </ul>

                    {/* 3. 관리적 보안 정책 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">3. 관리적 보안 정책</h3>
                    <p className="ml-4"><strong>3.1 정보보호 의식 및 교육</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>연 1회 이상 전 임직원 정보보호 교육 의무화</li>
                        <li>신규 입사자 보안 오리엔테이션 필수 이수</li>
                        <li>보안 서약서(비밀유지 등) 징구 및 관리</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>3.2 자산 관리</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>모든 시스템, 서버, 소프트웨어, 데이터베이스, 계정 등 정보자산 등록·관리</li>
                        <li>중요자산은 “중요/일반/민감” 등급 분류 및 차등 통제</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>3.3 권한 및 계정 관리</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>최소 권한 원칙(Least Privilege): 업무상 필요한 최소 권한만 부여</li>
                        <li>주기적 권한 점검: 분기 1회 이상 불필요/휴면 계정 회수</li>
                        <li>계정 발급/회수/변경/중지 절차 표준화 및 로그 관리</li>
                        <li>권한승인: 2단계 이상 승인 프로세스 적용(특권계정 등)</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>3.4 보안 사고 관리</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>보안 사고 대응 매뉴얼 별도 운영(탐지, 보고, 분석, 복구, 재발방지)</li>
                        <li>사고 발생시 1시간 이내 보고, 원인 조사 및 공식 보고서 작성 의무</li>
                        <li>개인정보 유출 등 법적/규제 보고 의무 준수(예: 24시간 이내 KISA 신고 등)</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>3.5 문서 및 미디어 관리</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>중요 문서·미디어는 암호화 저장/이동</li>
                        <li>민감 정보 출력/폐기시 파쇄 등 안전조치</li>
                        <li>문서 반출시 승인 절차 및 로그 기록</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>3.6 내부통제 및 감사</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>분기별 이상행위, 로그, 권한 등 내부감사 실시</li>
                        <li>결과는 CISO, 경영진에 보고, 시정조치</li>
                    </ul>

                    {/* 4. 기술적 보안 정책 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">4. 기술적 보안 정책</h3>
                    <p className="ml-4"><strong>4.1 접근 통제</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>네트워크: 방화벽, WAF, ACL로 내부/외부 구간 통제</li>
                        <li>VPN: 외부 접속은 VPN 및 2FA 적용 의무화</li>
                        <li>IP 제한: 관리자·DB 접근은 이중 인증 필수</li>
                        <li>시간제한: 특권계정, 시간대 제한</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>4.2 인증 및 암호 정책</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>비밀번호: 10자리 이상, 영문·숫자·특수문자 조합, 90일마다 변경 권장</li>
                        <li>계정 잠금: 5회 이상 실패시 자동 잠금 및 관리자 알림</li>
                        <li>API Key/Secret: 저장·전송시 암호화, 주기적 교체, 노출 방지, 보안 준수 의무 부과</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>4.3 데이터 보호</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>전송구간 암호화: TLS 1.2 이상 의무, 내부 API/DB 모두 포함</li>
                        <li>저장 데이터 암호화: 개인정보·민감정보는 DB/파일시스템 암호화(AES-256 등)</li>
                        <li>백업: 주기적 백업 및 별도 네트워크 분리 저장, 암호화</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>4.4 로그 및 모니터링</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>로그: 시스템, 애플리케이션, 접속, 보안 이벤트 등 모든 주요 행위 로그화</li>
                        <li>보관: 최소 1년, 민감 로그는 별도 보관(권한 분리)</li>
                        <li>모니터링: 24x7 실시간 이상탐지(IDS/IPS, SIEM 등), 공격/침해시 자동알림</li>
                        <li>로그 위변조 방지: WORM, HSM 등 적용 가능 시 활용</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>4.5 취약점 관리</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>정기 스캔: 분기 1회 이상 서버·DB·웹 취약점 점검(OWASP Top10 등)</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>4.6 AI/ML 보안</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>모델 접근제어: 모델 파일은 권한자에 한함</li>
                        <li>데이터셋 보호: 데이터셋을 이용한 취약점 방지</li>
                        <li>AI 오탐/과탐 모니터링: 예측 오류 이상치 실시간 모니터링 및 자동 알림</li>
                        <li>AI 모델 취약점 관리: 모델 중독 공격, 데이터 포이즈닝 등 AI 위협 대응 프로세스 구축</li>
                    </ul>

                    {/* 5. 개인정보 보호 정책 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">5. 개인정보 보호 정책</h3>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>수집 최소화: 서비스 제공에 필요한 최소한의 정보만 수집</li>
                        <li>암호화 저장: 개인정보/민감정보는 암호화 저장</li>
                        <li>접근통제: 개인정보 DB/서버 접근은 권한자에 한함</li>
                        <li>파기/폐기: 불필요해진 개인정보는 즉시 복구불가하게 파기, 파기내역 기록</li>
                    </ul>

                    {/* 6. 비상 대응 및 사고관리 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">6. 비상 대응 및 사고관리</h3>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>탐지/알림: 이상행위, 침해 사고시 실시간 탐지 및 즉시 알림</li>
                        <li>초동조치: 1시간 이내 영향 범위 파악 및 즉각 시스템 격리/차단</li>
                        <li>사고보고: 내부 매뉴얼(5단계) 및 법적 기관(24시간 이내 KISA 등) 동시 보고</li>
                    </ul>

                    {/* 7. 정책 이행 점검 및 관리 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">7. 정책 이행 점검 및 관리</h3>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>정기 점검: 연 1회 이상 전체 정책 및 시스템 실태 점검</li>
                        <li>정책 개정: 제도/환경 변화, 신규위협 등장시 정책 개정, 이력 관리</li>
                    </ul>

                    <p className="mt-8 text-xs text-gray-500">
                        작성일: 2025.07.14<br />
                        작성자: (보안담당자/이재원)<br /><br />
                        참고: 이 문서는 실제 심사(인증), 조직 운영, 신규 시스템 구축 등에 활용 가능한 포괄적 보안정책입니다. 외부 발설 금지.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SecurityPolicyModal;