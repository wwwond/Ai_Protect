import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware"; // Zustand의 `persist` 미들웨어와 스토리지 관련 유틸리티 임포트
import toast from "react-hot-toast"; // 사용자에게 알림 메시지를 표시하기 위한 토스트 라이브러리

// --- 1. 상태 타입 정의 ---

// 사용자 정보의 타입을 정의합니다.
interface User {
    emp_number: string; // 사번 (필수)
    name: string;       // 이름 (필수)
    email?: string;     // 이메일 (선택 사항)
    phone?: string;     // 전화번호 (선택 사항)
}

// 사이드바의 대분류 섹션들의 열림/닫힘 상태를 관리하는 타입입니다.
interface SectionOpenState {
    favorites: boolean;  // 즐겨찾기 섹션 열림 여부
    summary: boolean;    // 요약 섹션 열림 여부
    monitoring: boolean; // 모니터링 섹션 열림 여부
    attack: boolean;     // 공격 섹션 열림 여부
}

// 애플리케이션의 전체 전역 상태 타입을 정의합니다.
interface AppState {
    isLoggedIn: boolean;         // 사용자 로그인 여부
    user: User | null;           // 현재 로그인된 사용자 정보 (로그아웃 시 null)
    isSidebarCollapsed: boolean; // 사이드바 접힘 여부
    hasHydrated: boolean;        // `persist` 미들웨어에 의해 스토어가 초기화(rehydrate)되었는지 여부
    openSections: SectionOpenState; // 사이드바 섹션들의 열림 상태
    isNotificationOpen: boolean; // 알림 패널의 열림 여부

    // 알림 관련 상태
    hasUnread: boolean;  // 읽지 않은 알림이 있는지 여부
    unreadCount: number; // 읽지 않은 알림의 개수 (더미 값 포함)

    // --- 2. 액션 타입 정의 ---
    login: (user: User) => void;                                 // 사용자 로그인 처리 액션
    logout: () => void;                                          // 사용자 로그아웃 처리 액션
    updateUser: (user: User) => void;                            // 사용자 정보 업데이트 액션
    toggleSidebarCollapsed: () => void;                          // 사이드바 접힘 상태 토글 액션
    setHasHydrated: (v: boolean) => void;                        // `hasHydrated` 상태 설정 액션
    toggleSectionOpen: (key: keyof SectionOpenState) => void;    // 특정 사이드바 섹션 열림 상태 토글 액션
    toggleNotificationOpen: () => void;                          // 알림 패널 열림 상태 토글 액션

    // 알림 관련 액션
    setUnreadCount: (count: number) => void; // 읽지 않은 알림 개수 설정 액션
    markAllAsRead: () => void;               // 모든 알림을 읽음으로 처리하는 액션
}

// --- 3. 동적 스토리지 결정 함수 ---
// 사용자가 "로그인 유지" 옵션을 선택했는지 여부에 따라
// `localStorage` 또는 `sessionStorage`를 반환하는 함수입니다.
// `localStorage`는 브라우저를 닫아도 데이터가 유지되고, `sessionStorage`는 세션이 끝나면 데이터가 사라집니다.
const getDynamicStorage = (): StateStorage => {
    // `localStorage`에서 "keepLoggedIn" 키의 값을 확인합니다.
    const keepLoggedIn = localStorage.getItem("keepLoggedIn");
    // "keepLoggedIn" 값이 "true"이면 `localStorage`를, 그렇지 않으면 `sessionStorage`를 반환합니다.
    return keepLoggedIn === "true" ? localStorage : sessionStorage;
};

// --- 4. Zustand 스토어 생성 및 `persist` 미들웨어 적용 ---
// `create` 함수를 사용하여 스토어를 생성하고, `persist` 미들웨어를 적용하여 상태를 영구 저장합니다.
export const useAppStore = create<AppState>()(
    persist(
        // Zustand 스토어의 핵심 로직: 상태와 액션을 정의합니다.
        (set, get) => ({
            // --- 초기 상태 정의 ---
            isLoggedIn: false,         // 초기 로그인 상태는 false
            user: null,                // 초기 사용자 정보는 null
            isSidebarCollapsed: false, // 초기 사이드바는 펼쳐진 상태
            hasHydrated: false,        // 초기 hydration 상태는 false (아직 스토리지에서 로드되지 않음)

            // 사이드바 섹션들의 초기 열림 상태 (모두 열려있음)
            openSections: {
                favorites: true,
                summary: true,
                monitoring: true,
                attack: true,
            },
            isNotificationOpen: true, // 초기 알림 패널은 열려있음 (사용자 경험에 따라 변경 가능)

            // 🔔 알림 관련 초기 상태
            hasUnread: true,      // 초기에는 읽지 않은 알림이 있다고 가정
            unreadCount: 3,       // 초기 더미 읽지 않은 알림 개수

            // --- 액션 구현 ---

            // `hasHydrated` 상태를 설정하는 액션
            setHasHydrated: (v: boolean) => set({ hasHydrated: v }),

            // 사용자 로그인 처리 액션
            login: (user: User) => {
                // 유효하지 않은 사용자 정보가 전달되면 경고 메시지를 출력하고 함수를 종료합니다.
                if (!user || typeof user.emp_number !== "string") {
                    console.warn("유효하지 않은 사용자 정보입니다.");
                    return;
                }
                // `isLoggedIn`을 true로, `user`를 전달받은 사용자 정보로 설정합니다.
                set(() => ({ isLoggedIn: true, user }));
            },

            // 사용자 로그아웃 처리 액션
            logout: () => {
                // 모든 관련 상태를 초기값으로 되돌립니다.
                set(() => ({
                    isLoggedIn: false,
                    user: null,
                    isSidebarCollapsed: false, // 사이드바 상태 초기화
                    openSections: {            // 섹션 열림 상태 초기화
                        favorites: true,
                        summary: true,
                        monitoring: true,
                        attack: true,
                    },
                    isNotificationOpen: true, // 알림 패널 상태 초기화
                    hasUnread: false,         // 읽지 않은 알림 없음
                    unreadCount: 0,           // 읽지 않은 알림 개수 0
                }));
                // "로그인 유지" 플래그를 로컬 스토리지에서 제거합니다.
                localStorage.removeItem("keepLoggedIn");
                // 사용자에게 로그아웃 성공 토스트 메시지를 표시합니다.
                toast.success("로그아웃되었습니다.");
            },

            // 사용자 정보 업데이트 액션
            updateUser: (updatedUser: User) =>
                set((state) => ({
                    // 기존 사용자 정보에 업데이트된 정보를 병합합니다.
                    user: { ...state.user, ...updatedUser },
                })),

            // 사이드바 접힘 상태를 토글하는 액션
            toggleSidebarCollapsed: () =>
                set((state) => ({
                    isSidebarCollapsed: !state.isSidebarCollapsed, // 현재 상태의 반대로 설정
                })),

            // 특정 사이드바 섹션의 열림 상태를 토글하는 액션
            toggleSectionOpen: (key: keyof SectionOpenState) =>
                set((state) => ({
                    openSections: {
                        ...state.openSections,           // 기존 섹션 상태를 복사
                        [key]: !state.openSections[key], // 특정 섹션의 열림 상태를 토글
                    },
                })),

            // 알림 패널의 열림 상태를 토글하는 액션
            toggleNotificationOpen: () =>
                set((state) => ({
                    isNotificationOpen: !state.isNotificationOpen, // 현재 상태의 반대로 설정
                })),

            // ✅ 읽지 않은 알림 개수를 설정하는 액션
            setUnreadCount: (count: number) =>
                set(() => ({
                    unreadCount: count,      // 전달받은 개수로 설정
                    hasUnread: count > 0,    // 개수가 0보다 크면 읽지 않은 알림이 있다고 설정
                })),

            // ✅ 모든 알림을 읽음으로 처리하는 액션
            markAllAsRead: () =>
                set(() => ({
                    unreadCount: 0,   // 읽지 않은 알림 개수를 0으로 설정
                    hasUnread: false, // 읽지 않은 알림이 없다고 설정
                })),
        }),
        // `persist` 미들웨어 설정 객체
        {
            name: "app-storage", // 로컬/세션 스토리지에 저장될 키 이름
            storage: createJSONStorage(getDynamicStorage), // JSON 형식으로 데이터를 저장하고, 동적으로 결정된 스토리지를 사용
            // 스토어가 스토리지에서 데이터를 성공적으로 로드(rehydrate)한 후 호출되는 콜백 함수
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setHasHydrated(true); // `hasHydrated` 상태를 true로 설정하여 hydration 완료를 알림
                }
            },
        }
    )
);