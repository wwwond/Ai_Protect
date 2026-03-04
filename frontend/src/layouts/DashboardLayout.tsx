import React, { useState } from "react";
import Sidebar from "../components/Sidebar"; // 사이드바 컴포넌트 임포트
import TopNav from "../components/TopNav";     // 상단 내비게이션 바 컴포넌트 임포트
import Footer from "../components/Footer";     // 푸터 컴포넌트 임포트
import NotificationPanel from "../components/NotificationPanel"; // 알림 패널 컴포넌트 임포트
import { Outlet } from "react-router-dom"; // React Router의 `Outlet` 컴포넌트 임포트 (중첩 라우팅 콘텐츠 렌더링용)
import { useAppStore } from "../context/useAppStore"; // Zustand 앱 스토어 임포트

// --- DashboardLayout 컴포넌트 정의 ---
// 애플리케이션의 대시보드 레이아웃을 정의하는 함수형 컴포넌트입니다.
// 이 레이아웃은 사이드바, 상단 내비게이션 바, 메인 콘텐츠 영역, 푸터, 그리고 알림 패널을 포함합니다.
const DashboardLayout: React.FC = () => {
    // `sidebarOpen` 상태는 사이드바의 열림/닫힘 상태를 관리합니다. (현재는 `TopNav`로 prop이 전달되지만, `TopNav` 내부에서 `useAppStore`를 직접 사용하므로 이 상태는 현재 사용되지 않습니다.)
    const [sidebarOpen, setSidebarOpen] = useState(true);
    // Zustand `useAppStore`에서 알림 패널의 열림 상태를 가져옵니다.
    const isNotificationOpen = useAppStore((s) => s.isNotificationOpen);

    // --- DashboardLayout UI 렌더링 ---
    return (
        <div className="h-screen overflow-hidden flex bg-gray-50">
            {/* 사이드바 영역 */}
            {/* `transition-all duration-300` 클래스는 사이드바의 너비 변화에 부드러운 애니메이션을 적용합니다. */}
            {/* `sidebarOpen` 상태에 따라 너비를 `w-auto` (자동) 또는 `w-0` (0)으로 설정하여 사이드바를 보이거나 숨깁니다. */}
            {/* 참고: 현재 `sidebarOpen` 상태는 `TopNav`로 prop으로 전달되지만, `TopNav` 내에서 `useAppStore`의 `isSidebarCollapsed`를 직접 사용하므로 이 `sidebarOpen` 상태는 직접적으로 사이드바의 너비를 제어하지 않습니다. 대신 Tailwind CSS의 `w-auto`와 `w-0`는 실제로 사이드바 컴포넌트 자체의 크기가 아니라, 사이드바를 감싸는 부모 div의 크기를 제어합니다. 실제 사이드바 접힘/펼침은 `Sidebar` 컴포넌트 내부에서 `isSidebarCollapsed` 상태를 통해 관리됩니다. */}
            <div
                className={`transition-all duration-300 h-full ${
                    sidebarOpen ? "w-auto" : "w-0" // 이 부분은 실제 Sidebar 컴포넌트가 아닌, Sidebar를 감싸는 div의 너비를 제어합니다.
                }`}
            >
                <Sidebar /> {/* 사이드바 컴포넌트 렌더링 */}
            </div>

            {/* 메인 컨텐츠 영역 */}
            {/* `flex-1`은 남은 공간을 모두 차지하도록 하고, `flex-col`은 자식 요소들을 세로로 정렬합니다. */}
            <div className="flex flex-col flex-1 h-full">
                {/* 상단 내비게이션 바 컴포넌트 렌더링 */}
                {/* `sidebarOpen`과 `toggleSidebar` prop이 전달되지만, `TopNav`는 내부적으로 Zustand를 사용합니다. */}
                <TopNav
                    sidebarOpen={sidebarOpen}
                    toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                />

                {/* 메인 콘텐츠 영역 (라우팅된 페이지가 표시될 곳) */}
                {/* `flex-1`은 남은 세로 공간을 모두 차지하도록 하여 푸터가 항상 하단에 붙어있게 합니다. */}
                {/* `overflow-y-auto`는 콘텐츠가 넘칠 경우 세로 스크롤을 허용합니다. */}
                <main className="flex-1 p-4 overflow-y-auto">
                    <Outlet /> {/* 현재 라우트의 자식 컴포넌트가 이 위치에 렌더링됩니다. */}
                </main>

                {/* 푸터 영역 */}
                <div>
                    <Footer /> {/* 푸터 컴포넌트 렌더링 */}
                </div>
            </div>

            {/* 알림 패널 영역 */}
            {/* `transition-all duration-300` 클래스는 알림 패널의 너비 변화에 부드러운 애니메이션을 적용합니다. */}
            {/* `isNotificationOpen` Zustand 상태에 따라 너비를 `w-[300px]` (고정 너비) 또는 `w-0` (0)으로 설정하여 알림 패널을 보이거나 숨깁니다. */}
            <div
                className={`overflow-hidden transition-all duration-300 ${
                    isNotificationOpen ? "w-[300px]" : "w-0"
                }`}
            >
                <NotificationPanel /> {/* 알림 패널 컴포넌트 렌더링 */}
            </div>
        </div>
    );
};

export default DashboardLayout;