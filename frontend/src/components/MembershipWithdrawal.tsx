import React from "react";

// --- MembershipWithdrawal 컴포넌트의 props 인터페이스 정의 ---
interface MembershipWithdrawalProps {
    // 회원 탈퇴 완료 확인 버튼 클릭 시 호출될 콜백 함수입니다.
    onConfirm: () => void;
}

// --- MembershipWithdrawal 컴포넌트 정의 ---
// 회원 탈퇴가 완료되었음을 사용자에게 알리고, 확인 버튼을 제공하는 컴포넌트입니다.
const MembershipWithdrawal: React.FC<MembershipWithdrawalProps> = ({ onConfirm }) => {
    // --- 컴포넌트 UI 렌더링 ---
    return (
        // 메인 컨테이너: 텍스트 스타일과 간격 설정
        <div className="text-sm text-gray-700 space-y-4">
            {/* 회원 탈퇴 안내 메시지 섹션 */}
            <div>
                {/* 제목: 빨간색 강조 */}
                <h4 className="text-base font-semibold text-red-600 mb-1">
                    회원 탈퇴 안내
                </h4>
                {/* 탈퇴 완료 및 감사 메시지 */}
                <p className="mt-10">
                    회원 탈퇴가 완료되었습니다. <br /> {/* 줄바꿈 태그 */}
                    그동안 이용해주셔서 감사합니다.
                </p>
            </div>

            {/* 추가 메시지 섹션: 서비스 개선 노력 및 재회 기대 */}
            <div className="text-gray-600">
                보다 편리한 서비스를 제공하기 위해 노력중이며 <br /> {/* 줄바꿈 태그 */}
                다시 만나뵙길 기대합니다. <br /> {/* 줄바꿈 태그 */}
                감사합니다.
            </div>

            {/* 확인 버튼 섹션 */}
            <div className="pt-4">
                <button
                    // 버튼 클릭 시 `onConfirm` 콜백 함수 호출
                    onClick={onConfirm}
                    // 버튼 스타일링: 너비, 배경색, 텍스트 색상, 패딩, 둥근 모서리, 호버 효과, 전환 효과
                    className="w-64 bg-red-100 text-gray-600 py-2 px-4 rounded-md hover:bg-red-200 transition"
                >
                    회원 탈퇴 완료
                </button>
            </div>
        </div>
    );
};

export default MembershipWithdrawal;