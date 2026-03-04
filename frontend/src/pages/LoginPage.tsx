import React, { useState, useEffect } from "react";
import toast from "react-hot-toast"; // 토스트 알림을 위한 라이브러리
import { Eye, EyeOff } from "lucide-react"; // 비밀번호 가시성 토글 아이콘
import { images } from "../assets/assets"; // 이미지 에셋 (메인 비주얼 이미지)
import { useNavigate, useLocation } from "react-router-dom"; // React Router 훅 (페이지 이동, 현재 경로 정보)
import { useAppStore } from "../context/useAppStore"; // Zustand 앱 전역 상태 스토어


const API_USERDB_URL = import.meta.env.VITE_API_USERDB_URL;

// --- LoginPage 컴포넌트 정의 ---
// 사용자가 로그인할 수 있는 페이지 컴포넌트입니다.
// 사원번호, 비밀번호 입력 필드와 아이디 저장, 로그인 유지 옵션을 제공합니다.
// 로그인 성공 시 메인 페이지로 리다이렉트합니다.
const LoginPage: React.FC = () => {
    // 🔐 로그인 관련 상태 관리
    const [employeeId, setEmployeeId] = useState("");      // 사원번호 입력 필드 상태
    const [password, setPassword] = useState("");          // 비밀번호 입력 필드 상태
    const [showPassword, setShowPassword] = useState(false); // 비밀번호 보임/숨김 상태
    const [saveId, setSaveId] = useState(false);          // 아이디 저장 체크박스 상태
    const [keepLoggedIn, setKeepLoggedIn] = useState(false); // 로그인 유지 체크박스 상태
    const [error, setError] = useState("");                // 에러 메시지 상태

    // 🔄 라우터 관련 훅
    const navigate = useNavigate(); // 페이지 이동을 위한 navigate 함수
    const location = useLocation(); // 현재 URL 경로 정보를 가져오기 위한 location 객체

    // 🔧 전역 상태(Zustand store)
    const login = useAppStore((state) => state.login);             // 로그인 처리 액션
    const hasHydrated = useAppStore((state) => state.hasHydrated); // Zustand persist 미들웨어의 hydration 완료 여부
    const isLoggedIn = useAppStore((state) => state.isLoggedIn);   // 현재 로그인 상태

    /**
     * `isLoggedIn` 상태와 현재 경로를 감시하여 로그인 후 자동 리다이렉트를 처리합니다.
     * 사용자가 이미 로그인되어 있고 현재 경로가 메인 페이지('/')가 아니라면,
     * 메인 페이지로 즉시 이동시킵니다.
     */
    useEffect(() => {
        // `isLoggedIn`이 true이고 현재 경로가 루트('/')가 아닌 경우
        if (isLoggedIn && location.pathname !== '/') {
            navigate("/"); // 메인 페이지로 이동
        }
    }, [isLoggedIn, navigate, location]); // `isLoggedIn`, `Maps`, `location`이 변경될 때마다 실행

    /**
     * 컴포넌트 마운트 시 (및 `hasHydrated`가 true가 될 때) 로컬 스토리지에서
     * 저장된 아이디와 로그인 유지 상태를 복원합니다.
     */
    useEffect(() => {
        // Zustand 스토어가 로컬 스토리지에서 상태를 성공적으로 복원한 후에만 실행
        if (hasHydrated) {
            // "savedEmployeeId"가 로컬 스토리지에 저장되어 있는지 확인
            const savedId = localStorage.getItem("savedEmployeeId");
            if (savedId) {
                setEmployeeId(savedId); // 저장된 아이디로 `employeeId` 상태 설정
                setSaveId(true);        // "아이디 저장" 체크박스를 true로 설정
            }
            // "keepLoggedIn"이 로컬 스토리지에 "true"로 저장되어 있는지 확인
            const savedKeepLoggedIn = localStorage.getItem("keepLoggedIn");
            if (savedKeepLoggedIn === "true") {
                setKeepLoggedIn(true); // "로그인 유지" 체크박스를 true로 설정
            }
        }
    }, [hasHydrated]); // `hasHydrated` 상태가 변경될 때마다 실행

    /**
     * 로그인 시도 처리 함수입니다.
     * 폼 제출 시 호출되며, 입력 유효성 검사, API 호출, 응답 처리,
     * 전역 상태 업데이트 및 로컬 스토리지 저장을 수행합니다.
     * @param {React.FormEvent} e - 폼 제출 이벤트 객체
     */
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault(); // 폼의 기본 제출 동작(페이지 새로고침) 방지
        setError("");       // 이전 에러 메시지 초기화

        // 필수 입력 필드 (사원번호) 및 비밀번호 길이 (6자리 이상) 유효성 검사
        if (!employeeId || password.length < 6) {
            const message = "사원번호와 6자리 이상의 비밀번호를 입력해주세요.";
            setError(message);         // 에러 메시지 상태 설정
            toast.error(message);      // 토스트 알림으로 에러 메시지 표시
            return;                    // 함수 종료
        }

        // 로그인 진행 중임을 알리는 로딩 토스트 메시지 표시
        const loadingToastId = toast.loading("로그인 중입니다...");

        try {
            // 🔐 로그인 API 호출 (POST 요청)
            const response = await fetch(`${API_USERDB_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }, // JSON 형식으로 데이터 전송
                body: JSON.stringify({ // 요청 본문에 사원번호와 비밀번호 포함
                    emp_number: employeeId,
                    password: password,
                }),
            });

            // 응답이 성공적이지 않을 경우 (HTTP 상태 코드 2xx가 아닐 경우)
            if (!response.ok) {
                const errorData = await response.json(); // 서버에서 보낸 에러 응답 파싱
                let errorMessage = "로그인 실패";       // 기본 에러 메시지

                // 에러 메시지 상세 내용에 따라 메시지 설정
                if (Array.isArray(errorData.detail)) {
                    // 유효성 검사 오류와 같은 배열 형태의 에러 메시지 처리
                    errorMessage = errorData.detail.map((e: any) => e.msg).join(", ");
                } else if (typeof errorData.detail === "string") {
                    // 일반 문자열 형태의 에러 메시지 처리
                    errorMessage = errorData.detail;
                }

                setError(errorMessage);                   // 에러 메시지 상태 업데이트
                toast.error(errorMessage, { id: loadingToastId }); // 로딩 토스트를 에러 토스트로 업데이트
                return;                                   // 함수 종료
            }

            const data = await response.json();            // 성공 응답 데이터 파싱
            localStorage.setItem("accessToken", data.access_token); // 서버에서 받은 액세스 토큰 로컬 스토리지에 저장

            // 🔎 사용자 정보 요청
            // 로그인 성공 후 액세스 토큰을 사용하여 사용자 마이페이지 정보 요청
            const userRes = await fetch(`${API_USERDB_URL}/auth/mypage`, {
                headers: {
                    Authorization: `Bearer ${data.access_token}`, // 인증 헤더에 액세스 토큰 포함
                },
            });

            // 사용자 정보 요청이 성공적이지 않을 경우
            if (!userRes.ok) {
                const msg = "사용자 정보를 불러오지 못했습니다.";
                setError(msg);                            // 에러 메시지 상태 업데이트
                toast.error(msg, { id: loadingToastId }); // 로딩 토스트를 에러 토스트로 업데이트
                return;                                   // 함수 종료
            }

            const userData = await userRes.json(); // 사용자 정보 데이터 파싱
            console.log("마이페이지에서 받아온 사용자 데이터:", userData); // 콘솔에 사용자 데이터 출력

            // 전역 로그인 상태 저장 (Zustand 스토어 업데이트)
            login({
                emp_number: userData.emp_number,
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
            });

            // "로그인 유지" 설정 저장 (true/false 문자열로 변환하여 저장)
            localStorage.setItem("keepLoggedIn", String(keepLoggedIn));
            // "아이디 저장" 설정에 따라 사원번호를 로컬 스토리지에 저장하거나 제거
            if (saveId) {
                localStorage.setItem("savedEmployeeId", employeeId);
            } else {
                localStorage.removeItem("savedEmployeeId");
            }

            // 로그인 성공 토스트 메시지 표시
            toast.success("로그인 성공!", { id: loadingToastId });

            // 메인 페이지로 이동
            navigate("/");

        } catch (error) {
            // 네트워크 오류 또는 기타 예외 발생 시 처리
            console.error("로그인 처리 중 오류 발생:", error);
            toast.error("서버와 통신 중 오류가 발생했습니다.", { id: loadingToastId });
            setError("서버와 통신 중 오류가 발생했습니다.");
        }
    };

    // --- LoginPage UI 렌더링 ---
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="flex flex-col md:flex-row w-full max-w-[1300px] md:h-[880px] bg-white rounded-2xl overflow-hidden">
                {/* 왼쪽 이미지 영역 */}
                <div className="w-full md:w-1/2 flex items-center justify-center">
                    <div className="w-[80%] aspect-[16/9] md:h-[80%] rounded-2xl overflow-hidden shadow">
                        <img
                            src={images.main} // `images` 객체에서 `main` 이미지 경로 사용
                            alt="Main visual" // 이미지 대체 텍스트
                            className="w-full h-full object-cover" // 이미지가 컨테이너를 채우도록 설정
                        />
                    </div>
                </div>

                {/* 오른쪽 로그인 폼 영역 */}
                <div className="w-full md:w-1/2 flex items-center justify-center p-8">
                    <div className="w-full max-w-sm">
                        <h1 className="text-3xl font-semibold text-gray-900 text-center mb-2">
                            👋 Welcome Back 👋 {/* 환영 메시지 */}
                        </h1>
                        <p className="text-center text-gray-500 mb-6 text-sm">
                            오늘도 좋은 하루입니다.
                            <br />
                            네트워크 보안 관리를 시작하세요!
                        </p>

                        {/* 로그인 폼 */}
                        <form onSubmit={handleLogin} className="space-y-4">
                            {/* 사원번호 입력 필드 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    사원번호
                                </label>
                                <input
                                    type="text"
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    placeholder="사원번호 6자리"
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                                    required // 필수 입력 필드
                                />
                            </div>

                            {/* 비밀번호 입력 필드 */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    비밀번호
                                </label>
                                <input
                                    type={showPassword ? "text" : "password"} // `showPassword` 상태에 따라 텍스트 또는 비밀번호 타입 전환
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="비밀번호 6자리 이상"
                                    className="w-full border border-gray-300 rounded-lg p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                                    required // 필수 입력 필드
                                />
                                {/* 비밀번호 가시성 토글 버튼 */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-9.5 text-gray-400"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />} {/* 아이콘 전환 */}
                                </button>
                            </div>

                            {/* 토글 스위치들 (아이디 저장, 로그인 유지) */}
                            <div className="flex justify-between items-center">
                                {/* 아이디 저장 토글 */}
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setSaveId(!saveId)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            saveId ? "bg-gray-500" : "bg-gray-300" // 상태에 따른 배경색 변경
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                saveId ? "translate-x-6" : "translate-x-1" // 상태에 따른 위치 변경
                                            }`}
                                        />
                                    </button>
                                    <span className="ml-2 text-sm text-gray-700">아이디 저장</span>
                                </div>

                                {/* 로그인 유지 토글 */}
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setKeepLoggedIn(!keepLoggedIn)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            keepLoggedIn ? "bg-gray-500" : "bg-gray-300" // 상태에 따른 배경색 변경
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                keepLoggedIn ? "translate-x-6" : "translate-x-1" // 상태에 따른 위치 변경
                                            }`}
                                        />
                                    </button>
                                    <span className="ml-2 text-sm text-gray-700">로그인 유지</span>
                                </div>
                            </div>

                            {/* 에러 메시지 표시 */}
                            {error && <div className="text-sm text-red-500">{error}</div>}

                            {/* 비밀번호 찾기 링크 */}
                            <div className="text-right text-sm">
                                <a href="#" className="text-gray-500 hover:underline">
                                    비밀번호를 잊으셨나요?
                                </a>
                            </div>

                            {/* 로그인 제출 버튼 */}
                            <button
                                type="submit"
                                className="w-full bg-gray-500 py-3 rounded-lg font-medium hover:bg-gray-700 transition text-white text-sm"
                            >
                                로그인
                            </button>
                        </form>

                        {/* 회원가입 링크 */}
                        <p className="mt-6 text-center text-sm text-gray-500">
                            계정이 없으신가요?{" "}
                            <a href="/signup" className="text-[#4A4A4A] hover:underline">
                                회원가입
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;