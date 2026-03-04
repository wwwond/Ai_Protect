import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod'; // Zod는 스키마 기반 유효성 검사를 위한 라이브러리입니다.
import { zodResolver } from '@hookform/resolvers/zod'; // Zod 스키마를 React Hook Form에 통합하기 위한 리졸버입니다.
import toast from 'react-hot-toast'; // 사용자에게 알림 메시지를 표시하기 위한 토스트 라이브러리입니다.

// --- 폼 데이터 유효성 검사를 위한 Zod 스키마 정의 ---
// DownloadAuthModal 컴포넌트 내 폼 필드(사번, 비밀번호)의 유효성 규칙을 정의합니다.
const downloadAuthSchema = z.object({
    // 사번 필드는 최소 4자 이상이어야 합니다.
    emp_number: z.string().min(4, "사번은 최소 4자 이상이어야 합니다."),
    // 비밀번호 필드는 최소 8자 이상이어야 합니다.
    password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다."),
});

// Zod 스키마로부터 폼 데이터의 타입을 추론합니다.
// 이를 통해 TypeScript 환경에서 폼 데이터 객체의 타입 안정성을 보장합니다.
type DownloadAuthFormData = z.infer<typeof downloadAuthSchema>;

// --- DownloadAuthModal 컴포넌트의 props 인터페이스 정의 ---
interface DownloadAuthModalProps {
    // 모달의 열림/닫힘 상태를 제어합니다. (true: 열림, false: 닫힘)
    isOpen: boolean;
    // 모달을 닫을 때 호출될 콜백 함수입니다.
    onClose: () => void;
    // 인증 성공 시 사번과 비밀번호를 전달하여 호출될 콜백 함수입니다.
    onAuthenticate: (empNumber: string, password: string) => void;
}

// --- DownloadAuthModal 컴포넌트 정의 ---
// 애플리케이션 다운로드를 위한 사용자 인증 모달 컴포넌트입니다.
const DownloadAuthModal: React.FC<DownloadAuthModalProps> = ({ isOpen, onClose, onAuthenticate }) => {
    // React Hook Form의 useForm 훅을 사용하여 폼 상태 및 유효성 검사를 관리합니다.
    const {
        register, // 폼 입력 필드를 등록하는 함수입니다.
        handleSubmit, // 폼 제출을 처리하는 함수입니다.
        formState: { errors }, // 폼 유효성 검사 오류 객체를 포함합니다.
        reset, // 폼 필드를 기본값으로 초기화하는 함수입니다.
    } = useForm<DownloadAuthFormData>({
        // Zod 스키마를 사용하여 유효성 검사 로직을 연결합니다.
        resolver: zodResolver(downloadAuthSchema),
        // 폼 필드의 초기 기본값을 설정합니다.
        defaultValues: {
            emp_number: "",
            password: "",
        },
    });

    // 폼 제출(submit) 시 호출되는 핸들러 함수입니다.
    const onSubmit: SubmitHandler<DownloadAuthFormData> = (data) => {
        // 부모 컴포넌트로 인증에 필요한 사번과 비밀번호를 전달합니다.
        onAuthenticate(data.emp_number, data.password);
        // 폼 제출 후, 폼 필드를 초기화하여 다음 인증 시도를 준비합니다.
        reset();
    };

    // `isOpen` prop이 false일 경우 모달을 렌더링하지 않습니다 (null 반환).
    if (!isOpen) return null;

    // --- 모달 UI 렌더링 ---
    return (
        // 모달 오버레이: 배경을 어둡게 처리하고 모달을 중앙에 배치합니다.
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
            {/* 모달 내용 컨테이너 */}
            <div className="bg-white rounded-lg p-8 shadow-xl max-w-md w-full relative">
                {/* 모달 제목 */}
                <h3 className="text-2xl font-bold text-gray-600 mb-6 text-center">다운로드 인증</h3>
                {/* 모달 설명 텍스트 */}
                <p className="text-gray-600 mb-4 text-center">
                    애플리케이션 다운로드를 위해<br/> 사번과 비밀번호를 다시 입력해주세요.
                </p>
                {/* 인증 폼 */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* 사번 입력 필드 그룹 */}
                    <div>
                        {/* 시각적으로 숨겨진 라벨 (스크린 리더용) */}
                        <label htmlFor="modal-empNumber" className="sr-only">사번</label>
                        <input
                            id="modal-empNumber" // 입력 필드 고유 ID
                            type="text" // 텍스트 타입 입력
                            required // 필수 입력 필드
                            // Tailwind CSS를 이용한 스타일링 및 유효성 검사 오류에 따른 경계선 색상 변경
                            className={`appearance-none relative block w-full px-3 py-2 border ${
                                errors.emp_number ? "border-red-500" : "border-gray-300" // 오류 시 빨간색 경계선
                            } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm`}
                            placeholder="사번" // 플레이스홀더 텍스트
                            {...register("emp_number")} // React Hook Form에 필드 등록
                        />
                        {/* 사번 유효성 검사 오류 메시지 표시 */}
                        {errors.emp_number && (
                            <p className="mt-1 text-red-500 text-xs">{errors.emp_number.message}</p>
                        )}
                    </div>
                    {/* 비밀번호 입력 필드 그룹 */}
                    <div>
                        {/* 시각적으로 숨겨진 라벨 (스크린 리더용) */}
                        <label htmlFor="modal-password" className="sr-only">비밀번호</label>
                        <input
                            id="modal-password" // 입력 필드 고유 ID
                            type="password" // 비밀번호 타입 입력 (입력값 숨김)
                            required // 필수 입력 필드
                            // Tailwind CSS를 이용한 스타일링 및 유효성 검사 오류에 따른 경계선 색상 변경
                            className={`appearance-none relative block w-full px-3 py-2 border ${
                                errors.password ? "border-red-500" : "border-gray-300" // 오류 시 빨간색 경계선
                            } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm`}
                            placeholder="비밀번호" // 플레이스홀더 텍스트
                            {...register("password")} // React Hook Form에 필드 등록
                        />
                        {/* 비밀번호 유효성 검사 오류 메시지 표시 */}
                        {errors.password && (
                            <p className="mt-1 text-red-500 text-xs">{errors.password.message}</p>
                        )}
                    </div>
                    {/* 버튼 그룹 (취소, 확인) */}
                    <div className="flex justify-end space-x-3 mt-6">
                        {/* 취소 버튼 */}
                        <button
                            type="button" // 폼 제출을 방지하기 위해 type을 "button"으로 설정
                            onClick={() => { onClose(); reset(); }} // 모달 닫기 및 폼 초기화
                            className="flex-1 justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            취소
                        </button>
                        {/* 확인 (제출) 버튼 */}
                        <button
                            type="submit" // 폼 제출을 트리거
                            className="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-500 hover:bg-gray-600"
                        >
                            확인
                        </button>
                    </div>
                </form>
                {/* 모달 닫기 버튼 (우측 상단 X 버튼) */}
                <button
                    onClick={() => { onClose(); reset(); }} // 모달 닫기 및 폼 초기화
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <span className="sr-only">닫기</span> {/* 스크린 리더용 텍스트 */}
                    {/* 닫기 아이콘 (SVG) */}
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default DownloadAuthModal;