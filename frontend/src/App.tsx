import { Routes, Route } from "react-router-dom"; // React Router의 Routes와 Route 컴포넌트 임포트
import DashboardLayout from "./layouts/DashboardLayout"; // 대시보드 레이아웃 컴포넌트 임포트
import ProtectedRoute from "./ProtectedRoute"; // 인증이 필요한 경로를 보호하는 컴포넌트 임포트
import { Toaster } from "react-hot-toast"; // 전역 토스트 알림을 위한 Toaster 컴포넌트 임포트

// 페이지 컴포넌트 임포트
import LoginPage from "./pages/LoginPage";
import Mainpage from "./pages/Mainpage";
import NetworkTrafficMonitoring from "./pages/NetworkTrafficMonitoring";
import SystemNetworkMonitoring from "./pages/SystemNetworkMonitoring";
import TypeofNetworkTrafficAttack from "./pages/TypeofNetworkTrafficAttack";
import TypeofSystemLogAttack from "./pages/TypeofSystemLogAttack";
import MyPage from "./pages/MyPage";
import SignUpPage from "./pages/SignUpPage";
import ExternalAttackIPBlocking from "./pages/ExternalAttackIPBlocking";
import IsolateInternalInfectedPC from "./pages/IsolateInternalInfectedPC";
import Blockingcertainports from "./pages/Blockingcertainports";

/**
 * `App` 컴포넌트:
 * 애플리케이션의 전체 라우팅 구조를 정의합니다.
 * React Router를 사용하여 다양한 페이지와 레이아웃을 연결합니다.
 */
const App = () => (
    <>
        {/* `Routes` 컴포넌트는 여러 `Route` 컴포넌트를 감싸며, 현재 URL과 일치하는 첫 번째 `Route`를 렌더링합니다. */}
        <Routes>
            {/* 로그인 페이지 라우트: `/login` 경로로 접근 시 `LoginPage` 컴포넌트 렌더링 */}
            <Route path="/login" element={<LoginPage />} />

            {/* 회원가입 페이지 라우트: `/signup` 경로로 접근 시 `SignUpPage` 컴포넌트 렌더링 */}
            <Route path="/signup" element={<SignUpPage />} />

            {/* 보호된 대시보드 레이아웃 라우트 */}
            {/* 이 라우트 아래의 모든 자식 라우트는 `ProtectedRoute`에 의해 보호됩니다. */}
            {/* `DashboardLayout`은 `Outlet`을 사용하여 자식 라우트의 콘텐츠를 렌더링합니다. */}
            <Route
                path="/"
                element={
                    <ProtectedRoute> {/* 이 컴포넌트가 인증 여부를 확인합니다. */}
                        <DashboardLayout /> {/* 인증 성공 시 대시보드 레이아웃이 렌더링됩니다. */}
                    </ProtectedRoute>
                }
            >
                {/* index route: 부모 라우트의 경로(`/`)로 접근 시 기본으로 렌더링될 컴포넌트 */}
                {/* `Mainpage`가 `/` 경로의 기본 콘텐츠로 표시됩니다. */}
                <Route index element={<Mainpage />} />

                {/* 여기서부터 `DashboardLayout` 내부의 `<Outlet />` 위치에 렌더링될 페이지들 */}
                {/* 네트워크 트래픽 모니터링 페이지 */}
                <Route path="traffic" element={<NetworkTrafficMonitoring />} />
                {/* 시스템 네트워크 모니터링 페이지 */}
                <Route path="network" element={<SystemNetworkMonitoring />} />
                {/* 네트워크 트래픽 공격 유형 페이지 */}
                <Route path="typeofNetworkTrafficAttack" element={<TypeofNetworkTrafficAttack />} />
                {/* 시스템 로그 공격 유형 페이지 */}
                <Route path="typeofSystemLogAttack" element={<TypeofSystemLogAttack />} />
                {/* 외부 공격 IP 차단 페이지 */}
                <Route path="attackIPBlocking" element={<ExternalAttackIPBlocking />} />
                {/* 내부 감염 PC 격리 페이지 */}
                <Route path="isolateInternalInfectedPC" element={<IsolateInternalInfectedPC />} />
                {/* 특정 포트 차단 페이지 */}
                <Route path="blockingcertainports" element={<Blockingcertainports />} />

                {/* 마이 페이지 */}
                <Route path="mypage" element={<MyPage />} />
            </Route>
        </Routes>

        {/* `react-hot-toast`의 `Toaster` 컴포넌트:
            애플리케이션 전반에 걸쳐 토스트 알림을 표시하는 데 사용됩니다.
            `position`은 알림이 나타날 위치를, `toastOptions`는 기본 스타일을 설정합니다. */}
        <Toaster
            position="top-center" // 화면 상단 중앙에 알림 표시
            toastOptions={{
                duration: 3000, // 알림 표시 시간 (3초)
                style: { fontSize: "14px" }, // 알림 텍스트 폰트 크기
            }}
        />
    </>
);

export default App;