// src/components/SiteOperationPolicyModal.tsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react'; // 닫기 아이콘을 위해 lucide-react의 X 아이콘 import

interface SiteOperationPolicyModalProps {
    onClose: () => void;
}

const SiteOperationPolicyModal: React.FC<SiteOperationPolicyModalProps> = ({ onClose }) => {
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
                    <h2 className="text-2xl font-bold text-gray-800">사이트 운영 정의서</h2>
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
                    {/* 1. 문서 개요 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">1. 문서 개요</h3>
                    <p className="ml-4"><strong>1.1 목적</strong><br />본 문서는 ‘AI 기반 네트워크 보안 시스템’(이하 “본 시스템”)의 안정적 운영과 신뢰성 보장을 위한 표준 절차, 역할과 책임, 서비스 수준 목표를 정의함을 목적으로 한다. 이를 통해 모든 팀원이 일관된 기준으로 시스템을 관리하고, 장애 발생 시 신속하고 체계적으로 대응하여 서비스의 가용성, 보안성, 성능을 최우선으로 확보한다.</p>
                    <p className="ml-4"><strong>1.2. 적용 범위</strong><br />본 정책은 본 시스템을 구성하는 모든 인프라(서버, 네트워크, 데이터베이스)와 애플리케이션(백엔드, 프론트엔드, AI 모델, 데이터 수집 에이전트)의 운영 및 관리 전반에 적용된다.</p>

                    {/* 2. 서비스 운영 원칙 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">2. 서비스 운영 원칙</h3>
                    <ul className="list-disc ml-8 space-y-1">
                        <li><strong>가용성 (Availability):</strong> 사용자는 언제나 안정적으로 시스템에 접근하고 기능을 사용할 수 있어야 한다. 시스템의 월 가용성 목표는 99.5% 이상으로 한다.</li>
                        <li><strong>보안 (Security):</strong> 모든 운영 활동은 사전에 정의된 '보안 정책'을 최우선으로 준수해야 하며, 데이터와 시스템을 안전하게 보호해야 한다.</li>
                        <li><strong>성능 (Performance):</strong> 사용자의 요청에 대한 응답 시간은 평균 2초 이내를 목표로 하며, 시스템 리소스(CPU, 메모리)는 항상 80% 미만으로 유지되도록 관리한다.</li>
                        <li><strong>모니터링 및 로깅 (Monitoring & Logging):</strong> 모든 시스템 구성 요소의 상태는 실시간으로 모니터링되어야 하며, 모든 중요한 활동과 오류는 추적 가능한 로그로 기록되어야 한다.</li>
                    </ul>

                    {/* 3. 역할과 책임 (R&R) */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">3. 역할과 책임 (R&R)</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    <th className="py-2 px-4 border-b">역할</th>
                                    <th className="py-2 px-4 border-b">주요 책임</th>
                                    <th className="py-2 px-4 border-b">담당자</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 text-sm">
                                <tr>
                                    <td className="py-2 px-4 border-b">시스템 관리자</td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>서버, 네트워크, DB 등 인프라 모니터링 및 장애 대응</li>
                                            <li>백업/복구 수행</li>
                                            <li>보안 패치 적용</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">인프라팀, 보안운영팀</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4 border-b">AI 운영 담당자</td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>AI 모델 배포/운영 및 실시간 탐지 관리</li>
                                            <li>이상 탐지 정책 설정/튜닝</li>
                                            <li>오탐, 미탐 개선</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">AI팀</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4 border-b">백엔드 개발자</td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>백엔드 서비스의 유지보수 및 장애 대응</li>
                                            <li>로그/데이터 처리 파이프라인 관리</li>
                                            <li>장애시 API 패치</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">백엔드팀</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4 border-b">프론트엔드 개발자</td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>대시보드, 관리자 화면 등 UI 운영 및 장애 대응</li>
                                            <li>오류 모니터링 및 UI/UX 개선</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">프론트엔드팀</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4 border-b">보안 담당자</td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>보안 위협 탐지 및 분석</li>
                                            <li>정책 수립 및 사고 발생시 초동대응</li>
                                            <li>법적/규제 이슈 대응</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">보안팀, 보안운영팀</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4 border-b">고객지원 담당자</td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>장애/사고 발생시 고객 공지 및 문의 응대</li>
                                            <li>서비스 상태 안내 및 이슈 접수</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">고객지원팀(이동호)</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4 border-b">팀 리더/PM</td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>변경/배포 요청 승인</li>
                                            <li>전사 장애/사고 총괄</li>
                                            <li>부서간 커뮤니케이션 및 정책 개정 주도</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">PM</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 4. 표준 운영 절차 (SOP) */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">4. 표준 운영 절차 (SOP)</h3>
                    <p className="ml-4"><strong>4.1. 모니터링</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li><strong>대상:</strong> 서버 CPU/메모리 사용률, 네트워크 트래픽, 디스크 사용량, Elasticsearch 클러스터 상태, PostgreSQL 상태, 애플리케이션 응답 시간 및 에러율</li>
                        <li><strong>주기:</strong> 실시간 모니터링 (Kibana, Grafana 등 대시보드 활용)</li>
                        <li><strong>알림 기준:</strong> CPU 사용률 80% 초과 5분 이상 지속 시, 디스크 사용량 90% 초과 시 즉시 담당자에게 알림.</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>4.2. 장애 대응 절차</strong></p>
                    <ul className="list-decimal ml-8 space-y-1">
                        <li><strong>탐지 및 알림 (Detection & Alert):</strong> 모니터링 시스템이 장애를 탐지하면 즉시 관련 담당자(시스템 관리자, 개발자)에게 이메일, 메신저 등으로 알림을 발송한다.</li>
                        <li><strong>초기 대응 및 상황 공유 (Initial Response):</strong> 알림을 받은 담당자는 5분 이내에 장애 상황을 인지하고, 팀 공유 채널에 "장애 발생 인지 및 분석 시작"을 공유한다.</li>
                        <li><strong>원인 분석 (Triage & Diagnosis):</strong> 관련 로그 및 모니터링 대시보드를 통해 장애의 근본 원인을 분석한다.</li>
                        <li><strong>복구 및 조치 (Resolution):</strong> 분석된 원인을 바탕으로 시스템 재시작, 리소스 증설, 긴급 패치 등의 복구 조치를 수행한다.</li>
                        <li><strong>사후 분석 및 보고 (Post-mortem):</strong> 장애가 해결된 후, 24시간 이내에 장애 원인, 조치 내용, 재발 방지 대책을 포함한 '장애 보고서'를 작성하여 공유한다.</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>4.3. 정기 유지보수</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li><strong>보안 패치:</strong> 운영체제 및 모든 주요 소프트웨어의 보안 패치는 매월 셋째 주 수요일에 테스트 서버에 우선 적용 후, 이상이 없으면 다음 날 운영 서버에 적용한다.</li>
                        <li><strong>시스템 백업:</strong> PostgreSQL 데이터베이스: 매일 오전 3시에 전체 백업 수행. Elasticsearch 스냅샷: 매일 오전 4시에 주요 인덱스에 대한 스냅샷 생성. 백업 데이터는 최소 7일간 보관한다.</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>4.4. 변경 및 배포 관리</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li><strong>요청:</strong> 모든 변경 및 배포 작업은 최소 1일 전까지 GitHub의 이슈 트래커나 별도의 변경 관리 시스템에 등록되어야 한다.</li>
                        <li><strong>검토 및 승인:</strong> 팀 리더 또는 관련 파트 담당자는 변경 요청 내용을 검토하고, 서비스에 미칠 영향을 평가한 후 승인한다.</li>
                        <li><strong>실행:</strong> 배포는 사용량이 가장 적은 시간대(예: 평일 오전 7시 이전)에 수행하는 것을 원칙으로 한다.</li>
                        <li><strong>롤백 계획:</strong> 모든 배포는 문제가 발생했을 때 즉시 이전 버전으로 되돌릴 수 있는 롤백(Rollback) 절차를 반드시 포함해야 한다.</li>
                    </ul>

                    {/* 5. 정책 개정 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">5. 정책 개정</h3>
                    <p>본 운영 정책은 시스템의 변경, 조직의 변화, 또는 더 나은 운영 방안이 발견되었을 경우 팀의 논의를 거쳐 개정될 수 있다. 모든 개정 내용은 버전과 함께 이력으로 관리한다.</p>

                    <p className="mt-8 text-xs text-gray-500">
                        작성일: 2025.07.04<br />
                        작성자: 윤석찬<br />
                        수정일자: 2025.07.16<br />
                        수정인: 이재원
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SiteOperationPolicyModal;