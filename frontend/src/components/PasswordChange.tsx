import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react"; // 비밀번호 가시성 토글 아이콘 (눈, 눈꺼풀)을 Lucide React에서 가져옵니다.
import toast from "react-hot-toast"; // 사용자에게 알림 메시지를 표시하기 위한 토스트 라이브러리입니다.

// --- PasswordInput 컴포넌트의 props 인터페이스 정의 ---
interface PasswordInputProps {
    label: string; // 입력 필드의 라벨 텍스트입니다.
    value: string; // 입력 필드의 현재 값입니다.
    setValue: (v: string) => void; // 입력 필드 값이 변경될 때 호출될 콜백 함수입니다.
    show: boolean; // 비밀번호 가시성 상태 (true: 보임, false: 숨김)입니다.
    onToggleShow: () => void; // 비밀번호 가시성 토글 시 호출될 콜백 함수입니다.
    showStrength?: boolean; // 비밀번호 강도 표시 여부를 결정합니다. (선택 사항, 기본값 false)
    pwStrength?: string; // 표시될 비밀번호 강도 텍스트입니다. (예: "강함", "보통", "약함")
    isError?: boolean; // 입력 필드에 오류가 있는지 여부를 나타냅니다. (선택 사항, 기본값 false)
}

// --- PasswordInput 컴포넌트 정의 ---
// 비밀번호 입력 필드와 비밀번호 가시성 토글 기능을 제공하는 재사용 가능한 컴포넌트입니다.
// 비밀번호 강도 표시 및 오류 상태에 따른 시각적 피드백도 포함합니다.
const PasswordInput: React.FC<PasswordInputProps> = ({
    label,
    value,
    setValue,
    show,
    onToggleShow,
    showStrength = false, // 기본값을 false로 설정
    pwStrength,
    isError = false, // 기본값을 false로 설정
}) => (
    // 입력 필드와 라벨을 포함하는 컨테이너
    <div className="space-y-1">
        {/* 입력 필드의 라벨 */}
        <label className="block text-sm font-medium text-gray-800">{label}</label>
        {/* 입력 필드와 토글 버튼을 포함하는 상대적 위치 컨테이너 */}
        <div className="relative w-64">
            <input
                type={show ? "text" : "password"} // `show` prop에 따라 텍스트 또는 비밀번호 타입으로 전환
                value={value} // 입력 필드의 현재 값
                onChange={(e) => {
                    setValue(e.target.value); // 값 변경 시 상위 컴포넌트의 상태 업데이트
                    // console.log(label, e.target.value); // (디버깅용) 콘솔 로그
                }}
                autoComplete="off" // 자동 완성 기능 비활성화
                // Tailwind CSS를 이용한 스타일링. `isError` prop에 따라 테두리 색상 및 포커스 링 색상 변경
                className={`w-full rounded-lg border px-4 py-2 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 transition
                    ${isError ? "border-red-300 focus:ring-red-200 focus:border-red-600" : "border-gray-300 focus:ring-blue-200 focus:border-blue-300"}
                `}
            />
            {/* 비밀번호 가시성 토글 버튼 */}
            <button
                type="button" // 폼 제출을 방지하기 위해 type을 "button"으로 설정
                onClick={onToggleShow} // 클릭 시 비밀번호 가시성 토글
                // 버튼을 입력 필드 오른쪽에 배치하고 중앙 정렬
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500"
            >
                {show ? <EyeOff size={18} /> : <Eye size={18} />} {/* `show` 상태에 따라 아이콘 변경 */}
            </button>
        </div>
        {/* 비밀번호 강도 표시 (showStrength가 true이고 값이 있을 때만 표시) */}
        {showStrength && value && (
            <p
                // 비밀번호 강도에 따라 텍스트 색상 변경
                className={`text-xs font-medium mt-1 ${
                    pwStrength === "강함"
                        ? "text-green-600"
                        : pwStrength === "보통"
                        ? "text-yellow-600"
                        : "text-red-600"
                }`}
            >
                비밀번호 강도: {pwStrength}
            </p>
        )}
    </div>
);

// --- PasswordChange 컴포넌트 정의 ---
// 사용자가 비밀번호를 변경할 수 있는 UI를 제공하는 컴포넌트입니다.
// 현재 비밀번호, 새 비밀번호, 새 비밀번호 확인 입력 필드를 포함하며,
// 비밀번호 강도 검사 및 유효성 검사 피드백을 제공합니다.
const PasswordChange: React.FC = () => {
    // --- 상태 변수 정의 ---
    const [currentPw, setCurrentPw] = useState(""); // 현재 비밀번호 입력 필드의 상태
    const [newPw, setNewPw] = useState(""); // 새 비밀번호 입력 필드의 상태
    const [confirmPw, setConfirmPw] = useState(""); // 새 비밀번호 확인 입력 필드의 상태

    const [showCurrentPw, setShowCurrentPw] = useState(false); // 현재 비밀번호 가시성 상태
    const [showNewPw, setShowNewPw] = useState(false); // 새 비밀번호 가시성 상태
    const [showConfirmPw, setShowConfirmPw] = useState(false); // 새 비밀번호 확인 가시성 상태

    // 새 비밀번호와 확인 비밀번호 불일치에 대한 오류 상태
    const [isConfirmPwMismatch, setIsConfirmPwMismatch] = useState(false);
    // 현재 비밀번호와 새 비밀번호가 같은 경우에 대한 오류 상태
    const [isNewPwSameAsCurrentError, setIsNewPwSameAsCurrentError] = useState(false);

    // --- 비밀번호 강도 측정 함수 ---
    const getPasswordStrength = (pw: string) => {
        if (!pw) return ""; // 비밀번호가 없으면 빈 문자열 반환
        // 백엔드에서 요구하는 강력한 비밀번호 정규식 (영문, 숫자, 특수문자 포함, 10자 이상)
        const backendStrong = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{10,}$/;
        if (backendStrong.test(pw)) return "강함"; // 정규식 만족 시 "강함"
        if (pw.length >= 6) return "보통"; // 6자 이상이면 "보통"
        return "약함"; // 그 외 "약함"
    };

    // 새 비밀번호의 강도를 계산하여 상태로 저장합니다.
    const pwStrength = getPasswordStrength(newPw);

    // --- 입력 필드 변경 핸들러 함수들 ---

    // 현재 비밀번호 입력 필드 변경 핸들러
    const handleCurrentPwChange = (v: string) => {
        setCurrentPw(v);
        // 현재 비밀번호와 새 비밀번호가 같고, 비어있지 않을 때 오류 상태 설정
        setIsNewPwSameAsCurrentError(v === newPw && v !== "");
    };

    // 새 비밀번호 입력 필드 변경 핸들러
    const handleNewPwChange = (v: string) => {
        setNewPw(v);
        // 새 비밀번호가 변경될 때마다 확인 비밀번호와 비교하여 불일치 여부 업데이트
        setIsConfirmPwMismatch(v !== confirmPw && confirmPw !== "");
        // 새 비밀번호와 현재 비밀번호가 같고, 비어있지 않을 때 오류 상태 업데이트
        setIsNewPwSameAsCurrentError(currentPw === v && v !== "");
    };

    // 새 비밀번호 확인 입력 필드 변경 핸들러
    const handleConfirmPwChange = (v: string) => {
        setConfirmPw(v);
        // 확인 비밀번호가 변경될 때마다 새 비밀번호와 비교하여 불일치 여부 업데이트
        setIsConfirmPwMismatch(newPw !== v);
    };

    // --- 폼 제출 핸들러 함수 ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // 기본 폼 제출 동작 방지

        // 모든 필수 입력 필드가 채워져 있는지 확인
        if (!currentPw || !newPw || !confirmPw) {
            toast.error("모든 항목을 입력해주세요.");
            return;
        }

        // 새 비밀번호가 백엔드 규칙을 따르는지 확인 (제출 시 최종 검증)
        const backendStrongRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
        if (!backendStrongRegex.test(newPw)) {
            toast.error("새 비밀번호는 영문, 숫자, 특수문자를 포함하고 8자 이상이어야 합니다.");
            return;
        }

        // 새 비밀번호와 확인 비밀번호 불일치 검사
        if (newPw !== confirmPw) {
            toast.error("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
            setIsConfirmPwMismatch(true); // 불일치 시 오류 상태 설정
            return;
        } else {
            setIsConfirmPwMismatch(false); // 일치하면 오류 상태 해제
        }

        // 새 비밀번호가 현재 비밀번호와 같은지 검사
        if (newPw === currentPw) {
            toast.error("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
            setIsNewPwSameAsCurrentError(true); // 같으면 오류 상태 설정
            return;
        } else {
            setIsNewPwSameAsCurrentError(false); // 다르면 오류 상태 해제
        }

        // API 호출을 통한 비밀번호 변경 시도
        try {
            const token = localStorage.getItem("accessToken"); // 로컬 스토리지에서 액세스 토큰 가져오기
            if (!token) {
                toast.error("로그인 정보가 없습니다. 다시 로그인해주세요.");
                return;
            }

            // 백엔드 API 엔드포인트로 PUT 요청 전송
            const response = await fetch("http://localhost:8000/auth/change-password", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`, // 인증 헤더에 토큰 포함
                },
                // 요청 본문에 현재, 새, 확인 비밀번호 포함
                body: JSON.stringify({
                    current_password: currentPw,
                    new_password: newPw,
                    confirm_password: confirmPw,
                }),
            });

            if (response.ok) {
                // 성공적인 응답 처리
                toast.success("비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.");
                // 비밀번호 변경 성공 후 모든 입력 필드 및 오류 상태 초기화
                setCurrentPw("");
                setNewPw("");
                setConfirmPw("");
                setIsConfirmPwMismatch(false);
                setIsNewPwSameAsCurrentError(false);
            } else {
                // 오류 응답 처리
                const errorData = await response.json();
                toast.error(errorData.detail || "비밀번호 변경 중 오류가 발생했습니다.");
                // 특정 백엔드 오류 메시지에 따라 추가적인 UI 오류 표시 로직을 여기에 추가할 수 있습니다.
            }
        } catch (error) {
            // 네트워크 오류 또는 기타 예외 처리
            console.error("비밀번호 변경 요청 중 에러 발생:", error);
            toast.error("비밀번호 변경 요청 중 네트워크 오류가 발생했습니다.");
        }
    };

    // --- 컴포넌트 UI 렌더링 ---
    return (
        // 전체 폼 컨테이너
        <form onSubmit={handleSubmit} className="w-full h-full flex flex-col">
            {/* 제목 */}
            <h4 className="text-base font-semibold text-gray-900 mb-4">비밀번호 변경</h4>

            {/* 그리드 레이아웃: 왼쪽 (비밀번호 입력)과 오른쪽 (안내 및 버튼) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {/* 왼쪽 섹션: 비밀번호 입력 필드 */}
                <div className="flex justify-center md:justify-start md:ml-24">
                    <div className="space-y-5 w-full max-w-full md:max-w-md mx-auto md:mx-0 mt-2">
                        {/* 현재 비밀번호 입력 컴포넌트 */}
                        <PasswordInput
                            label="현재 비밀번호"
                            value={currentPw}
                            setValue={handleCurrentPwChange}
                            show={showCurrentPw}
                            onToggleShow={() => setShowCurrentPw((v) => !v)}
                            isError={isNewPwSameAsCurrentError} // 현재 비밀번호와 새 비밀번호가 같을 때 오류 표시
                        />
                        {/* 새 비밀번호 입력 컴포넌트 */}
                        <PasswordInput
                            label="새 비밀번호"
                            value={newPw}
                            setValue={handleNewPwChange}
                            show={showNewPw}
                            onToggleShow={() => setShowNewPw((v) => !v)}
                            showStrength // 비밀번호 강도 표시 활성화
                            pwStrength={pwStrength} // 계산된 비밀번호 강도 전달
                            isError={isNewPwSameAsCurrentError} // 새 비밀번호가 현재 비밀번호와 같을 때 오류 표시
                        />
                        {/* 새 비밀번호 확인 입력 컴포넌트 */}
                        <PasswordInput
                            label="새 비밀번호 확인"
                            value={confirmPw}
                            setValue={handleConfirmPwChange}
                            show={showConfirmPw}
                            onToggleShow={() => setShowConfirmPw((v) => !v)}
                            isError={isConfirmPwMismatch} // 새 비밀번호와 확인 비밀번호가 다를 때 오류 표시
                        />
                    </div>
                </div>

                {/* 오른쪽 섹션: 비밀번호 규칙 안내 및 저장 버튼 */}
                <div className="flex flex-col justify-between">
                    <div className="mt-11">
                        {/* 비밀번호 설정 규칙 카드 */}
                        <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 w-80 max-w-full">
                            <p className="mb-1 font-medium text-gray-800">🔐 비밀번호 설정 규칙</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>영문 + 숫자 필수</li>
                                <li>특수문자 1개 이상 반드시 포함</li>
                                <li>최소 8자 이상 권장</li>
                            </ul>
                        </div>

                        {/* 비밀번호 변경 버튼 */}
                        <div className="flex mt-6">
                            <button
                                type="submit" // 폼 제출을 트리거
                                className="px-6 py-2 bg-blue-100 text-gray-600 font-semibold rounded-md text-sm hover:bg-blue-200 transition"
                            >
                                네, 모두 확인했습니다. 비밀번호를 변경합니다.
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default PasswordChange;