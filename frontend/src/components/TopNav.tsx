import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; // React Router 훅 임포트
import { Menu, Star, LogOut, User, Home, MessageSquare } from "lucide-react"; // Lucide React 아이콘 임포트
import { motion, AnimatePresence } from "framer-motion"; // Framer Motion을 이용한 애니메이션
import { useAppStore } from '../context/useAppStore'; // 전역 앱 상태 (사이드바, 알림, 사용자 등)
import { useFavoritesStore } from '../context/useFavoritesStore'; // 즐겨찾기 상태

// --- TopNav 컴포넌트 정의 ---
// 애플리케이션의 상단 내비게이션 바 컴포넌트입니다.
// 현재 시간, 페이지 경로, 즐겨찾기, 사용자 메뉴 (마이페이지, 로그아웃), 알림 기능을 포함합니다.
const TopNav: React.FC = () => {
    // React Router의 `useLocation` 훅을 사용하여 현재 경로 정보를 가져옵니다.
    const location = useLocation();
    // React Router의 `useNavigate` 훅을 사용하여 프로그래밍 방식의 페이지 이동을 처리합니다.
    const navigate = useNavigate();

    // Zustand `useAppStore`에서 사이드바 접힘 상태와 토글 함수를 가져옵니다.
    const isCollapsed = useAppStore((s) => s.isSidebarCollapsed);
    const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);

    // Zustand `useFavoritesStore`에서 즐겨찾기 목록과 토글 함수를 가져옵니다.
    const favorites = useFavoritesStore((s) => s.favorites);
    const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

    // Zustand `useAppStore`에서 알림 토글 함수, 로그아웃 함수, 사용자 정보, 읽지 않은 알림 여부를 가져옵니다.
    const toggleNotificationOpen = useAppStore((s) => s.toggleNotificationOpen);
    const logoutZustand = useAppStore((s) => s.logout);
    const user = useAppStore((s) => s.user);
    const hasUnread = useAppStore((s) => s.hasUnread);

    // 사용자 드롭다운 메뉴의 열림/닫힘 상태를 관리합니다.
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    // 드롭다운 메뉴 외부 클릭 감지를 위한 `useRef` 훅입니다.
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 현재 시간을 표시하기 위한 상태입니다.
    const [currentTime, setCurrentTime] = useState("");

    /**
     * 컴포넌트 마운트 시 현재 시간을 1초마다 업데이트하는 `useEffect` 훅입니다.
     */
    useEffect(() => {
        const updateTime = () => {
            const now = new Date(); // 현재 날짜 및 시간 객체 생성
            const yyyy = now.getFullYear(); // 년도
            const mm = String(now.getMonth() + 1).padStart(2, "0"); // 월 (0부터 시작하므로 +1)
            const dd = String(now.getDate()).padStart(2, "0"); // 일
            const hh = String(now.getHours()).padStart(2, "0"); // 시
            const min = String(now.getMinutes()).padStart(2, "0"); // 분
            const ss = String(now.getSeconds()).padStart(2, "0"); // 초

            const dayNames = ["일", "월", "화", "수", "목", "금", "토"]; // 요일 배열
            const day = dayNames[now.getDay()]; // 현재 요일

            // 포맷된 시간 문자열 생성 (예: 2025.07.11 (금) 15:30:45)
            const formatted = `${yyyy}.${mm}.${dd} (${day}) ${hh}:${min}:${ss}`;
            setCurrentTime(formatted); // 상태 업데이트
        };

        updateTime(); // 컴포넌트 마운트 시 한 번 즉시 업데이트
        const interval = setInterval(updateTime, 1000); // 1초마다 `updateTime` 함수 호출
        return () => clearInterval(interval); // 컴포넌트 언마운트 시 인터벌 정리
    }, []); // 빈 의존성 배열은 컴포넌트 마운트 시 한 번만 실행됨을 의미합니다.

    /**
     * 드롭다운 메뉴 외부 클릭을 감지하여 드롭다운을 닫는 `useEffect` 훅입니다.
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // 드롭다운 참조가 존재하고, 클릭된 요소가 드롭다운 내부에 포함되지 않는 경우
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false); // 드롭다운 닫기
            }
        };
        // 문서에 마우스 다운 이벤트 리스너 추가
        document.addEventListener("mousedown", handleClickOutside);
        // 컴포넌트 언마운트 시 이벤트 리스너 제거
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []); // 빈 의존성 배열은 컴포넌트 마운트 시 한 번만 실행됨을 의미합니다.

    /**
     * 마이페이지로 이동하고 드롭다운을 닫는 함수입니다.
     */
    const handleMyPage = () => {
        navigate("/mypage"); // 마이페이지 경로로 이동
        setIsDropdownOpen(false); // 드롭다운 닫기
    };

    /**
     * 로그아웃을 처리하는 함수입니다.
     * 서버에 토큰 무효화를 요청하고, 로컬 스토리지에서 인증 토큰을 제거한 후 
     * Zustand 상태를 초기화하고 로그인 페이지로 리다이렉트합니다.
     */
    const handleLogout = async () => { // ✅ async 추가
        try {
            const token = localStorage.getItem("access_token");
            if (token) {
                // ✅ [추가] 서버에 토큰을 무효화하도록 API 요청
                await fetch("http://localhost:8000/auth/logout", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error("서버 로그아웃 실패:", error);
        } finally {
            // ✅ API 요청 성공 여부와 관계없이 클라이언트에서는 항상 로그아웃 처리
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            logoutZustand();
            navigate("/login");
        }
    };

    // 현재 URL 경로를 파싱하여 첫 번째 세그먼트를 가져옵니다.
    // 예: "/traffic/detail" -> "traffic"
    const pathParts = location.pathname.split("/").filter(Boolean);
    const currentPath = pathParts[0] ?? "home"; // 경로가 없으면 "home"으로 설정
    // 현재 페이지가 즐겨찾기에 포함되어 있는지 확인합니다.
    const isFavorite = currentPath ? favorites.includes(currentPath) : false;

    // 현재 경로에 따른 메인 카테고리 매핑입니다.
    const mainCategoryMap: Record<string, string> = {
        traffic: "실시간 모니터링",
        network: "실시간 모니터링",
        typeofNetworkTrafficAttack: "공격 유형별 요약",
        typeofSystemLogAttack: "공격 유형별 요약",
        attackIPBlocking: "공격 유형별 대응 정책",
        isolateInternalInfectedPC: "공격 유형별 대응 정책",
        blockingcertainports: "공격 유형별 대응 정책",
    };

    // 현재 경로에 따른 서브 카테고리 라벨 매핑입니다.
    const labelMap: Record<string, string> = {
        home: "Main",
        traffic: "네트워크 트래픽 모니터링",
        network: "시스템 로그 모니터링",
        typeofNetworkTrafficAttack: "네트워크 트래픽 공격 유형",
        typeofSystemLogAttack: "시스템 로그 공격 유형",
        attackIPBlocking: "외부 공격 IP 차단",
        isolateInternalInfectedPC: "내부 감염 PC 관리",
        blockingcertainports: "특정 포트 차단",
        mypage: "My Page",
    };

    // 현재 페이지의 메인 카테고리와 서브 카테고리를 결정합니다.
    const mainCategory = mainCategoryMap[currentPath] || "";
    const subCategory =
        labelMap[currentPath] ??
        (currentPath ? currentPath.charAt(0).toUpperCase() + currentPath.slice(1) : "");

    // 사용자에게 친숙한 형태로 표시될 경로 배열을 만듭니다.
    const friendlyParts = mainCategory ? [mainCategory, subCategory] : [subCategory];
    // 사용자 이름의 첫 글자를 가져와 대문자로 변환하거나, 없으면 'U'를 사용합니다.
    const userInitial = user?.name?.charAt(0).toUpperCase() ?? "U";

    // --- TopNav UI 렌더링 ---
    return (
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 z-30 relative">
            {/* 중앙 실시간 시간 표시 영역 */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center text-sm text-gray-600 font-medium leading-tight">
                <span className="text-xs text-gray-500">Today</span>
                <span className="tracking-wide">{currentTime}</span>
            </div>

            {/* 왼쪽 섹션: 메뉴 토글 버튼 및 현재 경로 */}
            <div className="flex items-center gap-2">
                {/* 사이드바 토글 버튼 */}
                <button
                    onClick={toggleSidebarCollapsed}
                    title={isCollapsed ? "사이드바 열기" : "사이드바 접기"}
                >
                    <Menu className="w-5 h-5 text-gray-600" /> {/* 메뉴 아이콘 */}
                </button>

                {/* 현재 페이지 경로 표시 및 즐겨찾기 버튼 */}
                <div className="flex items-center text-sm text-gray-600">
                    {/* 홈 링크 */}
                    <Link to="/">
                        <Home className="w-4 h-4 mr-2" /> {/* 홈 아이콘 */}
                    </Link>
                    {/* 현재 경로가 있을 경우에만 즐겨찾기 버튼 표시 */}
                    {currentPath && (
                        <button
                            // "home" 페이지는 즐겨찾기에 추가/제거할 수 없도록 비활성화
                            onClick={currentPath !== "home" ? () => toggleFavorite(currentPath) : undefined}
                            disabled={currentPath === "home"}
                            aria-disabled={currentPath === "home"}
                            style={{ cursor: currentPath === "home" ? "default" : "pointer" }}
                        >
                            <Star
                                className={`w-4 h-4 mr-2 transition ${
                                    isFavorite ? "text-yellow-400 fill-yellow-400" : "text-gray-500"
                                }`}
                            /> {/* 즐겨찾기 별 아이콘 */}
                        </button>
                    )}
                    {/* 현재 경로 (메인/서브 카테고리) 표시 */}
                    {friendlyParts.map((part, idx) => (
                        <span
                            key={idx}
                            className={
                                // 마지막 부분은 굵게 표시하여 현재 페이지임을 강조
                                idx === friendlyParts.length - 1
                                    ? "text-black font-semibold"
                                    : "text-gray-600"
                            }
                        >
                            {part}
                            {/* 마지막 부분이 아니면 구분자 슬래시 추가 */}
                            {idx !== friendlyParts.length - 1 && (
                                <span className="mx-1 text-gray-400">/</span>
                            )}
                        </span>
                    ))}
                </div>
            </div>

            {/* 오른쪽 섹션: 사용자 메뉴 및 알림 */}
            <div className="flex items-center gap-4">
                {/* 사용자 드롭다운 메뉴 */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen((prev) => !prev)} // 클릭 시 드롭다운 토글
                        className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300"
                        title="사용자 메뉴"
                    >
                        <span className="text-sm font-semibold">{userInitial}</span> {/* 사용자 이니셜 */}
                    </button>

                    {/* Framer Motion을 사용한 드롭다운 메뉴 애니메이션 */}
                    <AnimatePresence>
                        {isDropdownOpen && (
                            <motion.div
                                key="dropdown" // AnimatePresence 내에서 고유 키 필요
                                initial={{ opacity: 0, scale: 0.95 }} // 초기 상태 (숨김)
                                animate={{ opacity: 1, scale: 1 }} // 나타날 때 상태
                                exit={{ opacity: 0, scale: 0.95 }} // 사라질 때 상태
                                transition={{ duration: 0.15 }} // 애니메이션 지속 시간
                                className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-md z-40 py-2 origin-top-right"
                            >
                                {/* 사용자 이름 표시 (있을 경우) */}
                                {user?.name && (
                                    <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                                        {user.name} 님 안녕하세요 ^^
                                    </div>
                                )}
                                {/* 드롭다운 메뉴 아이템 목록 */}
                                <ul className="text-sm text-gray-700">
                                    <li>
                                        <button
                                            onClick={handleMyPage}
                                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                                        >
                                            <User size={16} /> {/* 사용자 아이콘 */}
                                            마이페이지
                                        </button>
                                    </li>
                                    <li>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
                                        >
                                            <LogOut size={16} /> {/* 로그아웃 아이콘 */}
                                            로그아웃
                                        </button>
                                    </li>
                                </ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 알림 버튼 */}
                <div className="relative">
                    <button onClick={toggleNotificationOpen} title="알림 토글">
                        <MessageSquare className="w-5 h-5 mt-1" /> {/* 알림 벨 아이콘 */}
                        {/* 읽지 않은 알림이 있을 경우 빨간색 점 표시 */}
                        {hasUnread && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full border border-white" />
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default TopNav;