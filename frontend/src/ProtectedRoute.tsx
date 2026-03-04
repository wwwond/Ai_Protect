import { Navigate } from "react-router-dom"; // React Router의 Navigate 컴포넌트 임포트 (리디렉션을 위함)
import { useAppStore } from "./context/useAppStore"; // 전역 상태 관리를 위한 Zustand 스토어 훅 임포트
import type { ReactNode } from "react"; // React 노드 타입을 위한 타입 임포트

/**
 * ProtectedRoute 컴포넌트의 props 타입을 정의합니다.
 * `children`은 React 노드(컴포넌트, 엘리먼트 등)를 받을 수 있음을 나타냅니다.
 */
interface ProtectedRouteProps {
    children: ReactNode; // 보호된 경로 내부에 렌더링될 자식 컴포넌트
}

/**
 * `ProtectedRoute` 컴포넌트:
 * 이 컴포넌트는 사용자가 인증되었는지 확인하여, 인증되지 않은 경우 특정 경로로 리디렉션합니다.
 * Zustand 스토어의 상태가 로컬 스토리지에서 복원될 때까지 렌더링을 지연시키는 기능도 포함합니다.
 *
 * @param {ProtectedRouteProps} props - 자식 컴포넌트를 포함하는 props 객체
 * @returns {ReactNode | null} - 인증 상태에 따라 자식 컴포넌트 또는 Navigate 컴포넌트
*/
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    // `useAppStore` 훅을 사용하여 로그인 상태와 스토어 복원 상태를 가져옵니다.
    const isLoggedIn = useAppStore((s) => s.isLoggedIn); // 사용자의 로그인 여부 상태
    const hasHydrated = useAppStore((s) => s.hasHydrated); // Zustand 스토어가 로컬 스토리지에서 상태를 복원했는지 여부

    // Zustand 스토어의 상태가 로컬 스토리지에서 아직 복원되지 않았다면 `null`을 반환합니다.
    // 이는 새로고침 시 플리커링(깜빡임) 현상을 방지하고, 스토어 상태가 준비될 때까지 UI 렌더링을 막습니다.
    // 이 시간 동안 로딩 스피너 등을 보여줄 수 있습니다.
    if (!hasHydrated) return null;

    // 사용자가 로그인되어 있지 않다면 로그인 페이지로 리디렉션합니다.
    // `replace` prop은 현재 히스토리 스택의 항목을 대체하여 뒤로 가기 버튼으로 로그인 페이지에 다시 접근할 수 없게 합니다.
    if (!isLoggedIn) {
        return <Navigate to="/login" replace />; // ✨ 로그인되어 있지 않으면 `/login` 경로로 리디렉션
    }

    // 사용자가 로그인되어 있고, 스토어 상태가 성공적으로 복원되었다면,
    // 보호된 경로의 자식 컴포넌트들을 렌더링합니다.
    return <>{children}</>;
};

export default ProtectedRoute;