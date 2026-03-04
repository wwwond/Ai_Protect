import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "../context/useAppStore"; // Zustand 앱 전역 스토어 임포트
import {
  KeyRound,
  PhoneCall,
  AlertTriangle,
  Clock3,
  Eye,
  EyeOff,
  DownloadCloud,
} from "lucide-react"; // 아이콘 임포트
import { useNavigate } from "react-router-dom"; // React Router의 페이지 이동 훅 임포트

import PasswordChange from "../components/PasswordChange"; // 비밀번호 변경 컴포넌트 임포트
import MembershipWithdrawal from "../components/MembershipWithdrawal"; // 회원 탈퇴 컴포넌트 임포트

const API_USERDB_URL = import.meta.env.VITE_API_USERDB_URL;
const API_DATADB_URL = import.meta.env.VITE_API_DATADB_URL;

import toast from "react-hot-toast"; // 토스트 알림 라이브러리 임포트

// --- MyPage 컴포넌트 정의 ---
// 사용자 마이페이지를 렌더링하는 함수형 컴포넌트입니다.
// 사용자 정보를 표시하고, 비밀번호 변경, 비상연락망, 회원 탈퇴 등의 메뉴를 제공합니다.
const MyPage: React.FC = () => {
  // Zustand 스토어에서 사용자 정보를 가져옵니다.
  const user = useAppStore((state) => state.user);
  // ✅ [추가] 스토어에서 사용자 정보를 업데이트하는 함수를 가져옵니다.
  const updateUser = useAppStore((state) => state.updateUser);
  // ✅ [추가] 스토어에서 로그아웃 함수를 가져옵니다.
  const logoutZustand = useAppStore((state) => state.logout);
  // 현재 선택된 마이페이지 메뉴를 관리하는 상태 ('password', 'emergency', 'withdraw', 'security-program')
  const [selectedMenu, setSelectedMenu] = useState("password");

  // ✅ 비밀번호 확인 관련 상태 (마이페이지 접근 전 사용자 인증을 위한 모달)
  const [isVerified, setIsVerified] = useState(false); // 비밀번호 인증 여부
  const [password, setPassword] = useState(""); // 비밀번호 입력 필드 상태
  const [showPw, setShowPw] = useState(false); // 비밀번호 보임/숨김 상태
  const [isError, setIsError] = useState(false); // 비밀번호 확인 에러 상태
  const [isLoading, setIsLoading] = useState(false); // 비밀번호 확인 로딩 상태

  const navigate = useNavigate(); // 페이지 이동을 위한 navigate 함수
  // 모달의 DOM 요소를 참조하기 위한 useRef 훅
  const modalRef = useRef<HTMLDivElement>(null);

  /**
   * `handleClickOutside` 함수:
   * 모달 바깥 영역 클릭 시 메인 화면으로 이동시키는 이벤트 핸들러입니다.
   * @param {MouseEvent} e - 마우스 이벤트 객체
   */
  const handleClickOutside = (e: MouseEvent) => {
    // 모달 참조가 있고, 클릭된 요소가 모달 내부에 포함되지 않는 경우
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      navigate("/"); // 메인 페이지로 이동
    }
  };

  /**
   * 컴포넌트 마운트 시 외부 클릭 감지 리스너를 추가하고, 언마운트 시 제거합니다.
   * 이를 통해 비밀번호 확인 모달 외부를 클릭하면 메인 페이지로 돌아갈 수 있습니다.
   */
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside); // 이벤트 리스너 추가
    return () => {
      document.removeEventListener("mousedown", handleClickOutside); // 클린업 함수에서 이벤트 리스너 제거
    };
  }, []); // 빈 의존성 배열로 한 번만 실행되도록 설정

  /**
   * ✅ [추가] 컴포넌트 마운트 시 서버로부터 최신 사용자 정보를 가져옵니다.
   */
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        const response = await fetch(`${API_USERDB_URL}/auth/mypage`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const userData = await response.json();
          updateUser(userData); // 성공 시 스토어의 사용자 정보 업데이트
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    fetchUserData();
  }, [updateUser]);

  /**
   * `PasswordInputModal` 컴포넌트:
   * 마이페이지 접근 전 비밀번호를 확인하는 모달 UI를 렌더링합니다.
   * 이 컴포넌트는 MyPage 내부에서만 사용되는 중첩 컴포넌트입니다.
   * @param {object} props - 컴포넌트 속성
   * @param {string} props.label - 입력 필드 레이블
   * @param {string} props.value - 입력 필드 값
   * @param {(val: string) => void} props.setValue - 입력 필드 값 변경 핸들러
   * @param {boolean} props.show - 비밀번호 표시 여부
   * @param {() => void} props.onToggleShow - 비밀번호 표시 토글 핸들러
   * @param {boolean} [props.isError] - 에러 발생 여부
   * @param {boolean} [props.isLoading] - 로딩 상태 여부
   * @param {() => void} props.onSubmit - 제출 핸들러
   */
  const PasswordInputModal: React.FC<{
    label: string;
    value: string;
    setValue: (val: string) => void;
    show: boolean;
    onToggleShow: () => void;
    isError?: boolean;
    isLoading?: boolean;
    onSubmit: () => void;
  }> = ({ label, value, setValue, show, onToggleShow, isError, isLoading, onSubmit }) => {
    return (
      <div
        ref={modalRef} // 모달 외부 클릭 감지를 위한 ref
        className="backdrop-blur-sm rounded-xl shadow-xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()} // 모달 내부 클릭 시 이벤트 전파 방지
      >
        <form
          onSubmit={(e) => {
            e.preventDefault(); // 폼 기본 제출 동작 방지
            onSubmit(); // 외부에서 전달받은 제출 함수 호출
          }}
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-3 text-center">
            비밀번호 확인
          </h2>
          <p className="text-gray-600 mb-6 text-center text-sm">
            마이페이지에 접근하려면 비밀번호를 입력해주세요.
          </p>

          <label htmlFor="password-input" className="block text-gray-700 font-medium mb-2">
            {label}
          </label>
          <div className="relative">
            <input
              id="password-input"
              type={show ? "text" : "password"} // `show` 상태에 따라 비밀번호 타입 변경
              className={`w-full border rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-1 ${
                isError ? "border-red-500" : "border-gray-300 focus:gray-blue-300" // 에러 시 스타일 변경
              } placeholder-gray-500 text-gray-900 rounded-md`}
              value={value}
              onChange={(e) => setValue(e.target.value)} // 입력 값 변경 핸들러
              autoComplete="current-password" // 자동 완성 힌트
              spellCheck={false} // 스펠링 검사 비활성화
              autoFocus // 페이지 로드 시 자동 포커스
            />
            {/* 비밀번호 보임/숨김 토글 버튼 */}
            <button
              type="button"
              onClick={onToggleShow} // 토글 함수 호출
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              {show ? <EyeOff size={20} /> : <Eye size={20} />} {/* 아이콘 전환 */}
            </button>
          </div>
          {/* 에러 메시지 표시 */}
          {isError && (
            <p className="mt-2 text-sm text-red-600">비밀번호가 올바르지 않습니다.</p>
          )}

          {/* 비밀번호 확인 제출 버튼 */}
          <button
            type="submit"
            disabled={isLoading} // 로딩 중일 때 버튼 비활성화
            className="mt-6 w-full px-4 py-2 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            {isLoading ? "확인 중..." : "비밀번호 확인"} {/* 로딩 텍스트 전환 */}
          </button>
        </form>
      </div>
    );
  };

  /**
   * `handlePasswordCheck` 함수:
   * 사용자가 입력한 비밀번호를 서버에 전송하여 확인하는 비동기 함수입니다.
   * 인증 성공 시 `isVerified` 상태를 true로 설정하여 마이페이지 콘텐츠를 표시합니다.
   */
  const handlePasswordCheck = async () => {
    // 비밀번호가 입력되지 않았으면 에러 토스트 표시
    if (!password) {
      toast.error("비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true); // 로딩 상태 시작
    setIsError(false); // 이전 에러 상태 초기화

    try {
      // 로컬 스토리지에서 액세스 토큰 가져오기
      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("로그인 정보가 없습니다. 다시 로그인해주세요.");
        setIsLoading(false); // 로딩 상태 해제
        return;
      }

      // 서버의 비밀번호 확인 API에 POST 요청
      const res = await fetch(`${API_USERDB_URL}/auth/verify-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // 인증 토큰 포함
        },
        body: JSON.stringify({ password }), // 입력된 비밀번호 전송
      });

      // 응답이 성공적일 경우 (HTTP 상태 코드 200-299)
      if (res.ok) {
        toast.success("비밀번호 확인 완료");
        setIsVerified(true); // 인증 성공 상태로 전환하여 마이페이지 콘텐츠 표시
        // 비밀번호 입력 필드는 모달이 사라지면서 자연스럽게 초기화됩니다.
        setIsError(false); // 에러 상태 해제
      } else {
        // 응답이 실패할 경우 (예: 비밀번호 불일치)
        const err = await res.json(); // 에러 응답 파싱
        toast.error(err.detail || "비밀번호가 일치하지 않습니다."); // 서버 에러 메시지 또는 기본 메시지 표시
        setIsError(true); // 에러 상태 활성화하여 입력 필드 스타일 변경
      }
    } catch (e) {
      // 네트워크 오류 등 예외 발생 시
      toast.error("서버 연결 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false); // 요청 완료 후 로딩 상태 해제
    }
  };

  /**
   * `handleWithdrawal` 함수:
   * 회원 탈퇴 API를 호출하고, 성공 시 로그아웃 처리 후 로그인 페이지로 이동합니다.
   */
  const handleWithdrawal = async () => {
    // 사용자에게 비밀번호 입력을 요구하여 탈퇴 의사를 재확인합니다.
    const passwordInput = prompt(
      "회원 탈퇴를 위해 현재 비밀번호를 입력해주세요. 이 작업은 되돌릴 수 없습니다."
    );
    if (!passwordInput) {
      toast.error("비밀번호가 입력되지 않아 탈퇴를 취소했습니다.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error("로그인 정보가 없습니다.");
      return;
    }

    try {
      // 서버에 회원 탈퇴 API(DELETE) 요청
      const response = await fetch(`${API_USERDB_URL}/auth/withdrawal`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: passwordInput }), // API 명세에 따라 비밀번호를 전송
      });

      if (response.ok) {
        toast.success("회원 탈퇴가 완료되었습니다. 안녕히 가세요.");
        // 탈퇴 성공 시, 클라이언트에서도 로그아웃 처리를 완벽하게 수행합니다.
        logoutZustand();
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refresh_token");
        navigate("/login"); // 로그인 페이지로 이동
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "회원 탈퇴에 실패했습니다. 비밀번호를 확인해주세요.");
      }
    } catch (error) {
      toast.error("네트워크 오류로 회원 탈퇴에 실패했습니다.");
    }
  };

  /**
   * `handleDownloadSecurityProgram` 함수:
   * 보안 프로그램 다운로드 API를 호출하여 파일을 다운로드합니다.
   * 회원가입 페이지의 다운로드 로직과 동일하게 작동하며, 인증 절차는 건너뜁니다.
   */
  const handleDownloadSecurityProgram = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error("로그인 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    const downloadingToastId = toast.loading("애플리케이션 다운로드 중...");

    try {
      const downloadResponse = await fetch(`${API_DATADB_URL}/api/agent/download`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }, // 토큰을 헤더에 포함
      });

      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json();
        throw new Error(errorData.detail || "다운로드 실패");
      }

      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "AttackDetectionAgent-Installer.zip"; // 파일명 지정
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("애플리케이션 다운로드가 시작됩니다!", { id: downloadingToastId });
    } catch (error: any) {
      toast.error(error.message || "파일 다운로드 중 오류 발생", { id: downloadingToastId });
    }
  };

  /**
   * `getDaysSince` 함수:
   * 주어진 날짜 문자열로부터 현재까지 경과한 일수를 계산합니다.
   * @param {string | undefined} dateStr - 날짜를 나타내는 문자열 (ISO 8601 형식 권장)
   * @returns {number | null} - 경과 일수 또는 날짜가 유효하지 않으면 null
   */
  const getDaysSince = (dateStr?: string): number | null => {
    if (!dateStr) return null; // 날짜 문자열이 없으면 null 반환
    const lastChanged = new Date(dateStr); // 입력된 날짜 문자열로 Date 객체 생성
    const now = new Date(); // 현재 날짜 Date 객체 생성
    // 두 날짜 간의 밀리초 차이를 계산하고, 이를 일수로 변환하여 반환
    const diff = Math.floor((+now - +lastChanged) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // 사용자의 마지막 비밀번호 변경일로부터 경과한 일수 계산
  const daysSincePwChange = getDaysSince(user?.lastPasswordChange);

  // --- 조건부 렌더링: 비밀번호 확인 모달 ---
  // `isVerified`가 false이면 비밀번호 확인 모달을 렌더링합니다.
  if (!isVerified) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50 p-6">
        <PasswordInputModal
          label="비밀번호"
          value={password}
          setValue={setPassword}
          show={showPw}
          onToggleShow={() => setShowPw((v) => !v)}
          isError={isError}
          isLoading={isLoading}
          onSubmit={handlePasswordCheck}
        />
      </div>
    );
  }

  // 사용자 정보가 없을 경우 (예: 로그인되지 않은 상태) 메시지 표시
  if (!user) {
    return <div className="p-6 text-center text-gray-500">로그인이 필요합니다.</div>;
  }

  // --- MyPage 메인 UI 렌더링 (비밀번호 확인 후) ---
  return (
    <div className="p-7 max-w-7xl mx-auto space-y-6">
      {/* 상단 유저 정보 카드 - 4등분 레이아웃 */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 grid grid-cols-1 sm:grid-cols-4 gap-6">
        {/* 1번 칸: 유저 이미지 + 함께한 날짜 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:justify-start">
          {/* 사용자 이름의 첫 글자를 표시하는 원형 아이콘 */}
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-gray-600 text-2xl font-bold shadow-inner">
            {user.name?.charAt(0) ?? "U"}{" "}
            {/* 사용자 이름의 첫 글자 또는 기본 "U" */}
          </div>
          <div className="text-sm text-gray-700 text-center sm:text-left">
            <div className="font-semibold text-gray-900">{user.name} 님</div>
            <div>안녕하세요!</div>
          </div>
        </div>

        {/* 2번 칸: 사번, 이메일, 휴대폰 정보 */}
        <div className="text-sm text-gray-700 space-y-1 flex flex-col justify-center items-center sm:items-start">
          <div>
            <span className="font-medium text-gray-600">사번 : </span>
            {user.emp_number ?? "없음"}
          </div>
          <div>
            <span className="font-medium text-gray-600">이메일 : </span>
            {user.email ?? "없음"}
          </div>
          <div>
            <span className="font-medium text-gray-600">휴대폰 : </span>
            {/* 휴대폰 번호의 중간 4자리를 `****`로 마스킹 처리 */}
            {user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1-****-$2") : "없음"}
          </div>
        </div>

        {/* 3번 칸: 비밀번호 변경 알림 카드 */}
        <div className="bg-blue-50 border border-blue-300 rounded-md p-4 text-gray-600 text-xs flex flex-col justify-center">
          {/* `daysSincePwChange` 값에 따라 다른 메시지 표시 */}
          {daysSincePwChange === null ? (
            <>
              <div className="font-semibold mb-1">비밀번호 변경 기록 없음</div>
              <div>처음 로그인 이후 비밀번호를 변경한 기록이 없습니다.</div>
            </>
          ) : daysSincePwChange >= 90 ? ( // 비밀번호 변경일이 90일 이상 경과했을 경우
            <>
              <div className="font-semibold mb-1">비밀번호 변경 필요</div>
              <div>
                최근 비밀번호 변경이 {daysSincePwChange}일 전입니다. <br />
                보안을 위해 변경해주세요.
              </div>
            </>
          ) : (
            // 비밀번호 변경일이 90일 미만일 경우
            <>
              <div className="font-semibold mb-1">최근 비밀번호 변경</div>
              <div>{daysSincePwChange}일 전에 비밀번호를 변경하셨습니다.</div>
            </>
          )}
        </div>

        {/* 4번 칸: 업무 관련 간단 알림 카드 (정적 텍스트 예시) */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4 text-gray-600 text-xs flex flex-col justify-center">
          <div className="font-semibold mb-1">업무 알림</div>
          <div>
            다음 휴가일이 <span className="font-semibold">10일</span> 남았습니다.
            <br />
            다음 결재 대기 문서가 있습니다.
            <br />
            월간 업무 보고서 제출을 잊지 마세요.
          </div>
        </div>
      </div>

      {/* 중단 영역 - 메뉴 및 콘텐츠 */}
      <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-6">
        {/* 왼쪽 메뉴 영역 */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 min-h-[360px]">
          <h3 className="text-base font-semibold text-gray-900 mb-4">마이페이지 메뉴</h3>
          <ul className="space-y-2">
            <li>
              {/* 비밀번호 변경 메뉴 버튼 */}
              <button
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition ${
                  selectedMenu === "password"
                    ? "bg-blue-100 text-gray-600 font-medium" // 선택 시 스타일
                    : "hover:bg-gray-100 text-gray-700" // 비선택 시 스타일
                }`}
                onClick={() => setSelectedMenu("password")} // 클릭 시 메뉴 선택 상태 변경
              >
                <KeyRound size={16} /> 비밀번호 변경
              </button>
            </li>
            <li>
              {/* 비상연락망 메뉴 버튼 */}
              <button
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition ${
                  selectedMenu === "emergency"
                    ? "bg-blue-100 text-gray-600 font-medium"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                onClick={() => setSelectedMenu("emergency")}
              >
                <PhoneCall size={16} /> 비상연락망
              </button>
            </li>
            <li>
              {/* 보안 프로그램 다운로드 메뉴 버튼 */}
              <button
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition ${
                  selectedMenu === "security-program"
                    ? "bg-blue-100 text-gray-600 font-medium"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                onClick={() => setSelectedMenu("security-program")} // 메뉴 선택 상태만 변경
              >
                <DownloadCloud size={16} /> 보안 프로그램 다운로드
              </button>
            </li>
            <li className="pt-2 border-t mt-2">
              {/* 회원 탈퇴 메뉴 버튼 (경고색상) */}
              <button
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition ${
                  selectedMenu === "withdraw"
                    ? "bg-red-100 text-red-600 font-medium"
                    : "text-red-600 hover:bg-red-50"
                }`}
                onClick={() => setSelectedMenu("withdraw")}
              >
                <AlertTriangle size={16} /> 회원 탈퇴
              </button>
            </li>
          </ul>
        </div>

        {/* 오른쪽 콘텐츠 영역 */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 h-[360px] overflow-y-auto">
          {/* 선택된 메뉴에 따라 다른 컴포넌트 또는 콘텐츠 렌더링 */}
          {selectedMenu === "password" && <PasswordChange />} {/* 비밀번호 변경 컴포넌트 */}
          {selectedMenu === "emergency" && (
            <>
              <h4 className="text-base font-semibold mb-2 text-gray-900">비상연락망</h4>
              <p className="text-sm text-gray-600">비상 시 연락받을 정보를 설정하세요.</p>
              {/* TODO: 비상연락망 관리 컴포넌트 구현 및 여기에 렌더링 */}
            </>
          )}
          {selectedMenu === "security-program" && (
            <>
              <h4 className="text-base font-semibold mb-2 text-gray-900">
                보안 프로그램 다운로드
              </h4>
              <p className="text-sm text-gray-600">
                아래 버튼을 클릭하면 보안 프로그램 설치 파일이 다운로드됩니다.
                <br /> 설치 중 문제가 발생하면 IT 부서에 문의해주세요.
              </p>
              <button
                className="mt-4 px-4 py-2 bg-blue-100 text-sm font-semibold rounded-md hover:bg-blue-200 transition"
                onClick={handleDownloadSecurityProgram} // 버튼 클릭 시 다운로드 함수 호출
              >
                프로그램 다운로드
              </button>
            </>
          )}
          {selectedMenu === "withdraw" && (
            <MembershipWithdrawal
              // ✅ [변경] onConfirm에 위에서 만든 실제 탈퇴 함수를 연결합니다.
              onConfirm={handleWithdrawal}
            />
          )}
        </div>
      </div>

      {/* 하단 - 최근 활동 기록 영역 */}
      <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock3 size={18} className="text-blue-500" /> 최근 활동 기록
        </h3>
        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
          <li>최근 비밀번호 변경: {user.lastPasswordChange ?? "기록 없음"}</li>
          <li>최근 로그인: {user.lastLogin ?? "기록 없음"}</li>
          <li>비상연락망 정보 수정: {user.lastEmergencyContactUpdate ?? "기록 없음"}</li>
        </ul>
      </div>
    </div>
  );
};

export default MyPage;