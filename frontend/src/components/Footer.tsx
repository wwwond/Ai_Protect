import React, { useState } from "react";
// 생성한 모달 컴포넌트들을 import 합니다.
import SecurityPolicyModal from "../components/SecurityPolicyModal";
import OperationSecurityPolicyModal from "../components/OperationSecurityPolicyModal";
import SiteOperationPolicyModal from "../components/SiteOperationPolicyModal";

const Footer: React.FC = () => {
    // 어떤 모달을 열지 나타내는 상태. 'null'이면 어떤 모달도 열려있지 않음.
    const [activeModal, setActiveModal] = useState<string | null>(null);

    const openModal = (modalName: string) => {
        setActiveModal(modalName);
    };

    const closeModal = () => {
        setActiveModal(null);
    };

    return (
        <footer className="h-10 bg-white shadow-inner flex items-center justify-center text-xs text-gray-500">
            <div className="flex space-x-4">
                <span>운영담당 : 이재원 (1234-5678)</span>
                <span className="text-gray-300">|</span>
                <button
                    onClick={() => openModal('securityPolicy')}
                    className="text-gray-600 hover:underline focus:outline-none"
                >
                    보안정책
                </button>
                <button
                    onClick={() => openModal('operationSecurityPolicy')}
                    className="text-gray-600 hover:underline focus:outline-none"
                >
                    운영보안정책 정의서
                </button>
                <button
                    onClick={() => openModal('siteOperationPolicy')}
                    className="text-gray-600 hover:underline focus:outline-none"
                >
                    사이트 운영 정의서
                </button>
            </div>

            {/* activeModal 상태에 따라 적절한 모달 컴포넌트를 렌더링합니다. */}
            {activeModal === 'securityPolicy' && <SecurityPolicyModal onClose={closeModal} />}
            {activeModal === 'operationSecurityPolicy' && <OperationSecurityPolicyModal onClose={closeModal} />}
            {activeModal === 'siteOperationPolicy' && <SiteOperationPolicyModal onClose={closeModal} />}
        </footer>
    );
};

export default Footer;