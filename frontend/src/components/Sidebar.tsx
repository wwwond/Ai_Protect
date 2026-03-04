import React from "react";
import { useAppStore } from "../context/useAppStore"; // 전역 앱 상태 (사이드바 접힘/펼침, 섹션 열림 등)를 관리하는 Zustand 스토어입니다.
import { useFavoritesStore } from "../context/useFavoritesStore"; // 즐겨찾기 상태를 관리하는 Zustand 스토어입니다.
import { NavLink, useNavigate } from "react-router-dom"; // React Router를 사용하여 내비게이션 링크와 페이지 이동을 처리합니다.
import { LogOut } from "lucide-react"; // 로그아웃 아이콘을 Lucide React에서 가져옵니다.

// 사이드바 메뉴에 사용될 아이콘들을 Lucide React에서 가져옵니다.
import {
    X, // 즐겨찾기 항목 제거 아이콘
    Star, // 즐겨찾기 섹션 아이콘
    FileText, // 요약 정리 섹션 아이콘
    Activity, // 실시간 모니터링 섹션 아이콘
    ShieldCheck, // 공격 유형별 요약 섹션 아이콘
    ChevronDown, // 섹션이 열려 있을 때 아래쪽 화살표 아이콘
    ChevronRight, // 섹션이 닫혀 있을 때 오른쪽 화살표 아이콘
} from "lucide-react";

// 라우트 경로(키)에 대응하는 한글/영문 라벨 매핑 객체입니다.
// 사이드바 메뉴에 표시될 텍스트를 결정합니다.
const labelMap: Record<string, string> = {
    preview: "Preview", // 미리보기
    chart: "Chart",     // 차트
    traffic: "네트워크 트래픽 모니터링",
    network: "시스템 네트워크 모니터링", // 실제로는 "시스템 로그 모니터링"으로 사용되는 것으로 보임
    typeofNetworkTrafficAttack: "네트워크 트래픽 공격 유형",
    typeofSystemLogAttack: "시스템 로그 공격 유형",
    attackIPBlocking: "외부 공격 IP 차단",
    isolateInternalInfectedPC: "내부 감염 PC 격리", // "내부 감염 PC 관리"로 사용되는 것으로 보임
    blockingcertainports: "특정 포트 차단",
    mypage: "My Page" // 마이 페이지
    // 필요 시 추가 가능
};

// --- Sidebar 컴포넌트 정의 ---
// 애플리케이션의 주 내비게이션을 제공하는 사이드바 컴포넌트입니다.
// 즐겨찾기, 실시간 모니터링, 공격 유형별 요약, 대응 정책 등의 섹션과 로그아웃 기능을 포함합니다.
const Sidebar: React.FC = () => {
    // Zustand 전역 상태에서 즐겨찾기 배열을 가져옵니다.
    const favorites = useFavoritesStore((state) => state.favorites);
    // 즐겨찾기 토글 함수를 가져옵니다.
    const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

    // useAppStore에서 사이드바 접힘/펼침 상태를 가져옵니다.
    const isCollapsed = useAppStore((state) => state.isSidebarCollapsed);
    // 열려있는 섹션들의 상태를 가져옵니다.
    const openSections = useAppStore((state) => state.openSections);
    // 섹션 열림/닫힘 토글 함수를 가져옵니다.
    const toggleSectionOpen = useAppStore((state) => state.toggleSectionOpen);
    // useAppStore에서 로그아웃 액션을 가져옵니다.
    const logoutZustand = useAppStore((state) => state.logout);

    // React Router의 `useNavigate` 훅을 사용하여 프로그래밍 방식 내비게이션을 활성화합니다.
    const navigate = useNavigate();

    /**
     * 서브 메뉴 아이템에 적용될 CSS 클래스를 반환하는 헬퍼 함수입니다.
     * 사이드바의 접힘 상태(`isCollapsed`)에 따라 스타일을 조정합니다.
     * @param base 추가적으로 적용될 기본 CSS 클래스 문자열 (선택 사항)
     * @returns 적용할 CSS 클래스 문자열
     */
    const subItemClass = (base?: string) =>
        `${isCollapsed ? "flex justify-center text-center" : "ml-4"} ${
            base || ""
        }`;

    /**
     * 사이드바가 접힌 상태일 때 상단 테두리와 패딩을 추가하는 CSS 클래스를 반환합니다.
     * @returns 적용할 CSS 클래스 문자열
     */
    const dividerClass = isCollapsed ? "border-t pt-3 mt-3" : "";

    /**
     * 카테고리 라인에 적용될 공통 CSS 클래스를 반환하는 헬퍼 함수입니다.
     * 폰트 두께, 색상, 정렬 등을 제어하며, 접힘 상태에 따라 추가 스타일을 적용합니다.
     * @returns 적용할 CSS 클래스 문자열
     */
    const categoryLineClass = `font-semibold mt-4 flex items-center text-gray-600 cursor-pointer ${
        isCollapsed ? "justify-center" : ""
    } ${dividerClass}`;

    /**
     * 로그아웃을 처리하는 함수입니다.
     * 로컬 스토리지에서 인증 토큰을 제거하고, Zustand 상태를 초기화한 후 로그인 페이지로 리다이렉트합니다.
     */
    const handleLogout = () => {
        // 1. 로컬 스토리지에서 인증 관련 토큰(access token, refresh token)을 제거합니다.
        // 실제 사용된 키 이름에 따라 수정해야 합니다.
        localStorage.removeItem('accessToken'); // 예: 'accessToken'이라는 키로 저장했다면 이 코드를 사용합니다.
        localStorage.removeItem('refreshToken'); // 예: 'refreshToken'도 사용한다면 함께 제거합니다.

        // 2. useAppStore의 `logout` 액션을 호출하여 전역 로그인 상태를 `false`로 설정하고 사용자 정보를 초기화합니다.
        // 이 액션은 'keepLoggedIn' 플래그도 제거하여 자동 로그인을 방지합니다.
        logoutZustand();

        // 3. 로그인 페이지로 이동합니다.
        // `ProtectedRoute`가 `isLoggedIn:false`를 감지하여 자동으로 `/login`으로 리디렉션할 수 있지만,
        // 명시적으로 `Maps`를 호출하는 것이 사용자 경험을 더 명확하게 합니다.
        navigate("/login");
    };

    // --- 사이드바 UI 렌더링 ---
    return (
        <aside
            // 사이드바의 너비를 `isCollapsed` 상태에 따라 동적으로 변경하고, 전환 효과를 적용합니다.
            className={`${
                isCollapsed ? "w-14" : "w-[250px]"
            } h-screen bg-white shadow-sm flex flex-col transition-all duration-300 z-30`}
        >
            {/* 사이드바 상단 로고/앱 이름 영역 */}
            <div className="h-16 flex items-center justify-center font-bold text-lg shadow-sm">
                <NavLink to="/" className="truncate">
                    {/* 사이드바 접힘 상태에 따라 표시되는 텍스트 변경 */}
                    {isCollapsed ? "A" : "A.P"}
                </NavLink>
            </div>

            {/* 메인 내비게이션 영역: 스크롤 가능 */}
            <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-2 text-sm">
                    {/* 즐겨찾기 섹션 헤더 */}
                    <li
                        className={categoryLineClass}
                        onClick={() => toggleSectionOpen("favorites")} // 클릭 시 즐겨찾기 섹션 토글
                    >
                        <Star size={16} className={isCollapsed ? "" : "mr-2"} /> {/* 즐겨찾기 아이콘 */}
                        {/* 사이드바가 펼쳐진 상태일 때만 텍스트 및 토글 화살표 표시 */}
                        {!isCollapsed && (
                            <>
                                <span className="flex-1">즐겨찾기</span>
                                {openSections.favorites ? (
                                    <ChevronDown size={14} /> // 섹션이 열려있으면 아래쪽 화살표
                                ) : (
                                    <ChevronRight size={14} /> // 섹션이 닫혀있으면 오른쪽 화살표
                                )}
                            </>
                        )}
                    </li>
                    {/* 즐겨찾기 메뉴 아이템 목록 */}
                    {/* 즐겨찾기 섹션이 열려있고, 즐겨찾기 데이터가 있을 때만 렌더링 */}
                    {openSections.favorites &&
                        favorites
                            .filter((fav): fav is string => typeof fav === "string") // `string` 타입만 필터링 (불필요한 타입 오류 방지)
                            .map((fav, idx) => {
                                const label = labelMap[fav] ?? fav; // 라벨 맵에서 이름을 찾거나, 없으면 라우트 키 그대로 사용
                                const shortLabel = label.charAt(0).toUpperCase(); // 접힌 상태에서 표시될 짧은 라벨 (첫 글자)

                                return (
                                    <li
                                        key={idx} // 고유 키 (실제 앱에서는 고유 ID를 사용하는 것이 좋음)
                                        className={`${
                                            isCollapsed
                                                ? "group text-gray-700" // 접힌 상태일 때 스타일
                                                : "flex justify-between items-center group text-gray-700" // 펼쳐진 상태일 때 스타일
                                        } ${subItemClass()}`}
                                    >
                                        {/* 즐겨찾기 항목 버튼: 클릭 시 해당 라우트로 이동 */}
                                        <button
                                            onClick={() => navigate(`/${fav}`)}
                                            title={label} // 툴팁으로 전체 라벨 표시
                                            className={`px-2 py-1 rounded transition hover:bg-gray-100 ${
                                                isCollapsed
                                                    ? "text-gray-600 block px-2 py-1 rounded transition"
                                                    : "flex-1 truncate text-left" // 텍스트가 길면 잘라냄
                                            }`}
                                        >
                                            {isCollapsed ? shortLabel : label} {/* 접힘 상태에 따라 짧은/전체 라벨 표시 */}
                                        </button>

                                        {/* 즐겨찾기 제거 버튼 (펼쳐진 상태에서만 표시) */}
                                        {!isCollapsed && (
                                            <button
                                                onClick={() => toggleFavorite(fav)} // 클릭 시 즐겨찾기에서 제거
                                                title="즐겨찾기 제거"
                                                // 호버 시에만 아이콘이 나타나도록 `opacity-0 group-hover:opacity-100` 적용
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <X size={16} /> {/* X (닫기) 아이콘 */}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}

                    {/* 실시간 모니터링 섹션 헤더 */}
                    <li
                        className={categoryLineClass}
                        onClick={() => toggleSectionOpen("monitoring")} // 클릭 시 모니터링 섹션 토글
                    >
                        <Activity size={16} className={isCollapsed ? "" : "mr-2"} /> {/* 활동 아이콘 */}
                        {!isCollapsed && (
                            <>
                                <span className="flex-1">실시간 모니터링</span>
                                {openSections.monitoring ? (
                                    <ChevronDown size={14} />
                                ) : (
                                    <ChevronRight size={14} />
                                )}
                            </>
                        )}
                    </li>
                    {/* 실시간 모니터링 하위 메뉴 */}
                    {openSections.monitoring && (
                        <>
                            <li className={subItemClass()}>
                                <NavLink
                                    to="/traffic"
                                    title="네트워크 트래픽 모니터링"
                                    // 현재 활성화된 링크에 따라 스타일 변경
                                    className={({ isActive }) =>
                                        `text-gray-700 block px-2 py-1 rounded transition ${
                                            isActive
                                                ? "bg-blue-100 text-blue-600 font-medium"
                                                : "hover:bg-gray-100"
                                        }`
                                    }
                                >
                                    {isCollapsed ? "트" : "네트워크 트래픽 모니터링"}
                                </NavLink>
                            </li>
                            <li className={subItemClass()}>
                                <NavLink
                                    to="/network"
                                    title="시스템 로그 모니터링"
                                    className={({ isActive }) =>
                                        `text-gray-700 block px-2 py-1 rounded transition ${
                                            isActive
                                                ? "bg-blue-100 text-blue-600 font-medium"
                                                : "hover:bg-gray-100"
                                        }`
                                    }
                                >
                                    {isCollapsed ? "시" : "시스템 로그 모니터링"}
                                </NavLink>
                            </li>
                        </>
                    )}

                    {/* 공격 유형별 요약 섹션 헤더 */}
                    <li
                        className={categoryLineClass}
                        onClick={() => toggleSectionOpen("attack")} // 클릭 시 공격 섹션 토글
                    >
                        <ShieldCheck size={16} className={isCollapsed ? "" : "mr-2"} /> {/* 방패 체크 아이콘 */}
                        {!isCollapsed && (
                            <>
                                <span className="flex-1">공격 유형별 요약</span>
                                {openSections.attack ? (
                                    <ChevronDown size={14} />
                                ) : (
                                    <ChevronRight size={14} />
                                )}
                            </>
                        )}
                    </li>

                    {/* 공격 유형별 요약 하위 메뉴 */}
                    {openSections.attack && (
                        <>
                            <li className={subItemClass()}>
                                <NavLink
                                    to="/typeofNetworkTrafficAttack"
                                    title="네트워크 트래픽 공격 유형"
                                    className={({ isActive }) =>
                                        `text-gray-700 block px-2 py-1 rounded transition ${
                                            isActive
                                                ? "bg-blue-100 text-blue-600 font-medium"
                                                : "hover:bg-gray-100"
                                        }`
                                    }
                                >
                                    {isCollapsed ? "트" : "네트워크 트래픽 공격 유형"}
                                </NavLink>
                            </li>
                            <li className={subItemClass()}>
                                <NavLink
                                    to="/typeofSystemLogAttack"
                                    title="시스템 로그 공격 유형"
                                    className={({ isActive }) =>
                                        `text-gray-700 block px-2 py-1 rounded transition ${
                                            isActive
                                                ? "bg-blue-100 text-blue-600 font-medium"
                                                : "hover:bg-gray-100"
                                        }`
                                    }
                                >
                                    {isCollapsed ? "시" : "시스템 로그 공격 유형"}
                                </NavLink>
                            </li>
                        </>
                    )}

                    {/* 공격 유형별 대응 정책 섹션 헤더 */}
                    <li
                        className={categoryLineClass}
                        onClick={() => toggleSectionOpen("summary")} // 클릭 시 요약 섹션 토글
                    >
                        <FileText size={16} className={isCollapsed ? "" : "mr-2"} /> {/* 문서 아이콘 */}
                        {!isCollapsed && (
                            <>
                                <span className="flex-1">공격 유형별 대응 정책</span>
                                {openSections.summary ? (
                                    <ChevronDown size={14} />
                                ) : (
                                    <ChevronRight size={14} />
                                )}
                            </>
                        )}
                    </li>
                    {/* 공격 유형별 대응 정책 하위 메뉴 */}
                    {openSections.summary && (
                        <>
                            <li className={subItemClass()}>
                                <NavLink
                                    to="/attackIPBlocking"
                                    title="외부 공격 IP 차단"
                                    className={({ isActive }) =>
                                        `text-gray-700 block px-2 py-1 rounded transition ${
                                            isActive
                                                ? "bg-blue-100 text-blue-600 font-medium"
                                                : "hover:bg-gray-100"
                                        }`
                                    }
                                >
                                    {isCollapsed ? "외" : "외부 공격 IP 차단"}
                                </NavLink>
                            </li>
                            <li className={subItemClass()}>
                                <NavLink
                                    to="/isolateInternalInfectedPC"
                                    title="내부 감염 PC 관리"
                                    className={({ isActive }) =>
                                        `text-gray-700 block px-2 py-1 rounded transition ${
                                            isActive
                                                ? "bg-blue-100 text-blue-600 font-medium"
                                                : "hover:bg-gray-100"
                                        }`
                                    }
                                >
                                    {isCollapsed ? "내" : "내부 감염 PC 관리"}
                                </NavLink>
                            </li>
                            <li className={subItemClass()}>
                                <NavLink
                                    to="/blockingcertainports"
                                    title="특정 포트 차단"
                                    className={({ isActive }) =>
                                        `text-gray-700 block px-2 py-1 rounded transition ${
                                            isActive
                                                ? "bg-blue-100 text-blue-600 font-medium"
                                                : "hover:bg-gray-100"
                                        }`
                                    }
                                >
                                    {isCollapsed ? "특" : "특정 포트 차단"}
                                </NavLink>
                            </li>
                        </>
                    )}
                </ul>
            </nav>

            {/* 로그아웃 버튼 영역 */}
            <div className="p-4">
                {isCollapsed ? (
                    // 사이드바가 접혔을 때의 로그아웃 버튼 (아이콘만 표시)
                    <button
                        onClick={handleLogout}
                        title="로그아웃"
                        className="w-full flex items-center justify-center text-gray-500 hover:bg-gray-150 p-2 rounded transition"
                    >
                        <LogOut size={16} /> {/* 로그아웃 아이콘 */}
                    </button>
                ) : (
                    // 사이드바가 펼쳐졌을 때의 로그아웃 버튼 (아이콘과 텍스트 표시)
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:bg-gray-50 p-2 rounded transition"
                    >
                        <LogOut size={16} /> {/* 로그아웃 아이콘 */}
                        <span>로그아웃</span>
                    </button>
                )}
            </div>

            {/* 사이드바가 접힌 상태가 아닐 때만 하단 저작권 문구 표시 */}
            {!isCollapsed && (
                <div className="p-4 text-xs text-gray-500">© 2025 A.P</div>
            )}
        </aside>
    );
};

export default Sidebar;