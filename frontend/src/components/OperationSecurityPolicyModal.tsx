// src/components/OperationSecurityPolicyModal.tsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react'; // 닫기 아이콘을 위해 lucide-react의 X 아이콘 import

interface OperationSecurityPolicyModalProps {
    onClose: () => void;
}

const OperationSecurityPolicyModal: React.FC<OperationSecurityPolicyModalProps> = ({ onClose }) => {
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
                    <h2 className="text-2xl font-bold text-gray-800">운영 보안 정책 정의서</h2>
                    {/* 닫기 아이콘 변경 */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <p className="text-sm text-gray-600">문서 버전: 1.0</p>
                </div>

                {/* 내용 스크롤: overflow-y-auto 적용 */}
                <div className="p-6 pt-1 overflow-y-auto flex-grow space-y-4 text-gray-700 text-sm">
                    {/* 1. 운영 목적 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">1. 운영 목적</h3>
                    <p>본 정책은 'AI 기반 네트워크 보안 시스템' (이하 "본 시스템")의 안정적이고 효율적인 운영을 통해 조직의 정보 자산을 보호하고, 사이버 위협으로부터 안전한 네트워크 환경을 유지하는 것을 최우선 목적으로 합니다.</p>
                    <p>본 시스템은 지능형 위협 탐지 및 자동화된 대응을 통해 다음의 목표를 달성하고자 합니다.</p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li><strong>지능형 위협 대응:</strong> AI 기술을 활용하여 알려지지 않은 신종 및 변종 공격을 포함한 다양한 사이버 위협을 실시간으로 탐지하고 분석합니다.</li>
                        <li><strong>내부 자산 보호:</strong> 외부로부터의 불법적인 접근과 내부에서의 비정상적인 행위를 차단하여 중요 데이터 및 시스템을 안전하게 보호합니다.</li>
                        <li><strong>업무 연속성 확보:</strong> 보안 위협으로 인한 서비스 중단을 최소화하고, 신속한 복구를 통해 안정적인 업무 환경을 보장합니다.</li>
                        <li><strong>보안 인식 제고:</strong> 사용자에게 실시간 위협 정보와 보안 정책을 투명하게 공유하여 조직 전체의 보안 수준을 향상시킵니다.</li>
                    </ul>

                    {/* 2. 주요 운영 원칙 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">2. 주요 운영 원칙</h3>
                    <p>본 시스템은 다음의 원칙에 따라 운영 및 관리됩니다.</p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li><strong>최소 권한의 원칙 (Least Privilege):</strong> 시스템 접근 및 데이터 사용에 있어 사용자와 시스템은 업무 수행에 필요한 최소한의 권한만을 부여받습니다.</li>
                        <li><strong>자동화 및 신속성의 원칙 (Automation & Swiftness):</strong> 탐지된 위협에 대해서는 사전에 정의된 정책에 따라 자동으로 대응하여 피해 확산을 방지하고 대응 시간을 단축합니다.</li>
                        <li><strong>투명성 및 가시성의 원칙 (Transparency & Visibility):</strong> 모든 보안 활동과 탐지된 위협 정보는 대시보드를 통해 실시간으로 제공되며, 모든 대응 조치는 기록되고 추적 가능해야 합니다.</li>
                        <li><strong>서비스 영향 최소화의 원칙 (Minimizing Service Impact):</strong> 보안 조치는 업무 연속성에 미치는 영향을 최소화하는 방향으로 설계되고 실행됩니다. 자동 격리 및 차단 조치 시, 업무 필수 인원 및 시스템의 접근은 최대한 보장합니다.</li>
                    </ul>

                    {/* 3. 서비스 이용 정책 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">3. 서비스 이용 정책</h3>
                    <p>본 시스템을 이용하는 모든 사용자는 조직의 정보 자산을 보호할 공동의 책임이 있으며, 다음의 정책을 준수해야 합니다.</p>
                    <p className="ml-4"><strong>계정 관리:</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>사용자는 자신의 계정 정보(ID, 비밀번호)를 안전하게 관리해야 하며, 타인에게 양도하거나 공유할 수 없습니다.</li>
                        <li>비밀번호는 정기적으로 변경하고, 추측하기 어려운 조합으로 설정해야 합니다.</li>
                        <li>계정 정보 유출 또는 의심스러운 활동 발견 시 즉시 보안 담당자에게 신고해야 합니다.</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>시스템 이용:</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>사용자는 인가된 업무 목적으로만 시스템 및 네트워크 자원을 사용해야 합니다.</li>
                        <li>보안 시스템의 우회 시도, 악성 코드 유포, 비인가 프로그램 설치 등 시스템의 안정성을 저해하는 모든 행위는 금지됩니다.</li>
                    </ul>
                    <p className="ml-4 mt-4"><strong>위반 시 조치:</strong></p>
                    <ul className="list-disc ml-8 space-y-1">
                        <li>본 서비스 이용 정책을 위반하는 사용자에 대해서는 사안의 경중에 따라 시스템 접근 제한, 계정 정지 등의 조치가 취해질 수 있으며, 관련 규정에 따라 징계 절차가 진행될 수 있습니다.</li>
                    </ul>

                    {/* 4. 대응 정책 관리 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">4. 대응 정책 관리</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-300">
                            <thead>
                                <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    <th className="py-2 px-4 border-b">대응 시스템</th>
                                    <th className="py-2 px-4 border-b">정책명</th>
                                    <th className="py-2 px-4 border-b">발동 조건</th>
                                    <th className="py-2 px-4 border-b">자동 조치 내용</th>
                                    <th className="py-2 px-4 border-b">해제 절차</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700 text-sm">
                                <tr>
                                    <td className="py-2 px-4 border-b">외부 공격 IP 차단</td>
                                    <td className="py-2 px-4 border-b">악성 IP 자동 차단</td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>정책에 정의된 임계치 이상의 공격(DDoS, 무차별 대입 등)을 시도한 외부 IP</li>
                                            <li>1시간 내 10회 이상 동일 유형의 공격 탐지 시</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>해당 IP를 시스템 내 차단 목록에 등록</li>
                                            <li>해당 IP로부터의 모든 인바운드 트래픽을 24시간 동안 차단</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">-</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4 border-b">내부 감염 PC 격리</td>
                                    <td className="py-2 px-4 border-b">내부 확산 방지 격리</td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>'내부 이상행위 탐지(X-MAN 찾기)' 모델이 특정 PC를 '위험' 등급으로 판단</li>
                                            <li>내부망을 향한 대량의 악성 트래픽(랜섬웨어 전파 등) 발생 탐지 시</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>해당 PC의 모든 네트워크 연결을 차단</li>
                                            <li>보안팀 IP 대역에서의 원격 접속만 허용하여 분석 및 조치</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">-</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-4 border-b">특정 포트 차단</td>
                                    <td className="py-2 px-4 border-b">랜섬웨어 포트 차단</td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>내부 PC에서 SMB(445), RDP(3389) 등 랜섬웨어 주요 전파 경로 포트를 통해 비정상적인 확산 시도가 탐지될 경우</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>해당 PC의 특정 포트(예: 445번 포트)를 즉시 차단하여 수평 감염 방지</li>
                                        </ul>
                                    </td>
                                    <td className="py-2 px-4 border-b">-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>


                    {/* 5. 개정 및 약관사항 */}
                    <h3 className="text-xl font-semibold mt-6 mb-2">5. 개정 및 약관사항</h3>
                    <ul className="list-disc ml-8 space-y-1">
                        <li><strong>약관 동의:</strong> 본 시스템의 계정을 발급받고 이용하는 모든 사용자는 본 서비스 정책안에 동의하는 것으로 간주합니다.</li>
                        <li><strong>정책의 개정:</strong> 본 정책은 관련 법령의 개정, 정부 정책의 변경, 또는 보다 나은 서비스 제공을 위해 개정될 수 있습니다.</li>
                        <li><strong>개정 공지:</strong> 정책의 내용에 추가, 삭제 및 수정이 있을 경우, 시행 최소 7일 전에 시스템 대시보드 공지사항 또는 이메일을 통해 사용자에게 공지합니다. 단, 사용자의 권리 또는 의무에 중대한 영향을 미치는 변경의 경우 최소 30일 전에 공지합니다.</li>
                        <li><strong>효력 발생:</strong> 공지된 개정 정책은 명시된 시행일로부터 효력이 발생합니다. 사용자가 명시적인 거부 의사를 표시하지 않는 경우, 개정된 정책에 동의한 것으로 봅니다.</li>
                    </ul>

                    <p className="mt-8 text-xs text-gray-500">
                        작성일: 2024년 6월 24일<br />
                        작성자: 이재원<br />
                        관리부서: 보안팀
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OperationSecurityPolicyModal;