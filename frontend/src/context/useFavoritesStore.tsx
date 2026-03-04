import { create } from "zustand"; // Zustand 스토어 생성을 위한 `create` 함수 임포트
import { persist, createJSONStorage } from "zustand/middleware"; // Zustand `persist` 미들웨어와 JSON 스토리지 생성을 위한 유틸리티 임포트
import toast from "react-hot-toast"; // 사용자에게 알림 메시지를 표시하기 위한 토스트 라이브러리

// --- 1. 상태 타입 정의 ---

// 즐겨찾기 스토어의 상태와 액션 타입을 정의합니다.
interface FavoritesState {
    favorites: string[]; // 즐겨찾기 항목들의 경로(문자열) 배열
    toggleFavorite: (path: string) => void; // 즐겨찾기 항목을 추가하거나 제거하는 액션
    // clearFavorites: () => void; // 필요하다면 즐겨찾기 전체를 비우는 액션 (현재 주석 처리됨)
}

// --- 2. Zustand 스토어 생성 및 `persist` 미들웨어 적용 ---
// `create` 함수를 사용하여 `FavoritesState` 타입을 가진 스토어를 생성하고,
// `persist` 미들웨어를 적용하여 상태를 로컬 스토리지에 영구 저장합니다.
export const useFavoritesStore = create<FavoritesState>()(
    persist(
        // Zustand 스토어의 핵심 로직: 초기 상태와 액션을 정의합니다.
        (set, get) => ({
            // --- 초기 상태 정의 ---
            favorites: [], // 초기 즐겨찾기 목록은 비어있는 배열

            // --- 액션 구현 ---

            /**
             * `toggleFavorite` 액션:
             * 특정 `path` (경로 문자열)를 즐겨찾기에 추가하거나 제거합니다.
             * 즐겨찾기는 최대 5개까지 등록할 수 있으며, 이를 초과하면 오류 토스트 메시지를 표시합니다.
             *
             * @param {string} path - 즐겨찾기에 추가하거나 제거할 항목의 경로
             */
            toggleFavorite: (path: string) => {
                // `path`가 문자열이 아니면 경고 메시지를 출력하고 함수를 종료합니다.
                if (typeof path !== "string") {
                    console.warn("즐겨찾기 경로는 문자열이어야 합니다.");
                    return;
                }

                // 현재 즐겨찾기 목록을 가져오고, 혹시 모를 비-문자열 요소를 필터링합니다.
                const currentFavorites = get().favorites.filter((f): f is string => typeof f === "string");
                // 해당 `path`가 이미 즐겨찾기 목록에 존재하는지 확인합니다.
                const exists = currentFavorites.includes(path);

                if (exists) {
                    // 이미 존재하는 경우: 즐겨찾기에서 해당 `path`를 제거합니다.
                    set({ favorites: currentFavorites.filter((p) => p !== path) });
                    toast("즐겨찾기에서 제거됨", { icon: "❌" }); // 제거 알림 토스트
                } else {
                    // 존재하지 않는 경우:
                    // 즐겨찾기 최대 개수 (5개)를 초과하는지 확인합니다.
                    if (currentFavorites.length >= 5) {
                        toast.error("즐겨찾기는 최대 5개까지 등록 가능합니다."); // 개수 초과 알림 토스트
                        return; // 추가하지 않고 함수 종료
                    }
                    // 최대 개수를 초과하지 않으면, 즐겨찾기 목록에 해당 `path`를 추가합니다.
                    set({ favorites: [...currentFavorites, path] });
                    toast("즐겨찾기에 추가됨", { icon: "⭐" }); // 추가 알림 토스트
                }
            },

            // `clearFavorites` 액션 (현재 주석 처리됨):
            // 필요시 주석을 해제하여 모든 즐겨찾기를 비우는 기능을 추가할 수 있습니다.
            // clearFavorites: () => set({ favorites: [] }),
        }),
        // `persist` 미들웨어 설정 객체
        {
            name: "favorites-storage", // 로컬 스토리지에 저장될 키 이름
            // `createJSONStorage`를 사용하여 JSON 형식으로 데이터를 저장하고 `localStorage`를 스토리지로 사용합니다.
            // 즐겨찾기 정보는 사용자가 브라우저를 닫아도 유지되어야 하므로 `localStorage`가 적합합니다.
            storage: createJSONStorage(() => localStorage),
        }
    )
);