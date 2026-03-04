import React, { useEffect, useState, useRef } from "react";
import { useAppStore } from "../context/useAppStore"; // 전역 상태 관리를 위한 zustand 스토어 임포트
import { Send, Trash2 } from 'lucide-react'; // 아이콘 임포트

// 채팅 메시지의 타입을 정의하는 인터페이스
interface ChatMessage {
    id: string; // 메시지 고유 ID
    text: string; // 메시지 내용
    sender: "user" | "bot"; // 메시지 발신자 ("user" 또는 "bot")
}

// NotificationPanel React 컴포넌트 정의
const NotificationPanel: React.FC = () => {
    // useAppStore 훅을 사용하여 전역 상태(알림 패널 열림 여부)를 가져옴
    const isNotificationOpen = useAppStore((s) => s.isNotificationOpen);
    // useAppStore 훅을 사용하여 모든 알림을 읽음으로 표시하는 함수를 가져옴
    const markAllAsRead = useAppStore((s) => s.markAllAsRead);

    // 채팅 메시지 목록을 관리하는 상태. 초기 메시지들을 포함.
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 1, text: "네트워크 트래픽 및 시스템 로그 정보를 기반으로 챗봇 기능을 제공하고 있습니다.", sender: "bot" },
        { id: 1, text: "어떤 내용부터 확인하시겠어요?", sender: "bot" },
    ]);
    // 사용자가 입력 필드에 작성 중인 메시지를 관리하는 상태
    const [inputMessage, setInputMessage] = useState<string>("");
    // 대화 내역 삭제 확인 메시지 표시 여부를 관리하는 상태
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);

    // 메시지 목록의 스크롤을 가장 아래로 이동시키기 위한 ref
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ▼▼▼ [핵심 추가] AI 응답 대기 상태를 관리할 isLoading 상태를 추가합니다. ▼▼▼
    const [isLoading, setIsLoading] = useState<boolean>(false);

    /**
     * isNotificationOpen 상태가 변경될 때마다 실행되는 useEffect 훅.
     * 알림 패널이 열리면 (isNotificationOpen이 true일 때) 모든 알림을 읽음으로 표시합니다.
    */
    useEffect(() => {
        if (isNotificationOpen) {
            markAllAsRead();
        }
    }, [isNotificationOpen, markAllAsRead]); // 의존성 배열: isNotificationOpen 또는 markAllAsRead가 변경될 때 재실행

    /**
     * messages 상태가 변경될 때마다 실행되는 useEffect 훅.
     * 새로운 메시지가 추가되면 메시지 목록의 스크롤을 가장 아래로 이동시켜 최신 메시지가 보이도록 합니다.
    */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); // 부드러운 스크롤 적용
    }, [messages]); // 의존성 배열: messages가 변경될 때 재실행

    /**
     * 메시지 전송 버튼 클릭 또는 Enter 키 입력 시 호출되는 핸들러.
     * 사용자가 입력한 메시지를 메시지 목록에 추가하고, 봇의 응답을 시뮬레이션하여 추가합니다.
    */
    const handleSendMessage = async () => {
        // 비어있는 메시지, 로딩 중, 삭제 확인 중에는 전송 불가
        if (inputMessage.trim() === "" || isLoading || showDeleteConfirmation) return;

        const question = inputMessage;
        
        // (1) 사용자 메시지를 화면에 즉시 추가하여 빠른 UI 반응성 제공
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            text: question,
            sender: "user",
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputMessage(""); // 입력 필드 초기화
        
        // (2) 로딩 상태를 true로 변경하고, "생각 중..." 메시지 표시
        setIsLoading(true);
        const loadingMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: "생각 중...",
            sender: 'bot'
        };
        setMessages((prev) => [...prev, loadingMessage]);

        try {
            // (3) 백엔드 API(/api/analysis/ask)를 실제로 호출
            
            // localStorage에서 인증 토큰을 가져옵니다.
            const authToken = localStorage.getItem("accessToken"); 
            if (!authToken) {
                throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");
            }

            const response = await fetch("http://210.119.12.96:8001/api/analysis/ask", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // 가져온 인증 토큰을 헤더에 포함하여 전송
                    "Authorization": `Bearer ${authToken}`,
                },
                body: JSON.stringify({ question }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "서버와의 통신에 실패했습니다.");
            }

            const data = await response.json();
            
            // (4) 백엔드로부터 받은 AI의 실제 답변을 생성
            const botResponse: ChatMessage = {
                id: (Date.now() + 2).toString(),
                text: data.answer,
                sender: "bot",
            };
            
            // "생각 중..." 메시지를 실제 답변으로 교체
            setMessages((prev) => [...prev.slice(0, -1), botResponse]);

        } catch (error: any) {
            // 에러 발생 시, 에러 메시지를 봇의 답변으로 표시
            const errorResponse: ChatMessage = {
                id: (Date.now() + 2).toString(),
                text: `오류가 발생했습니다: ${error.message}`,
                sender: "bot",
            };
            // "생각 중..." 메시지를 에러 답변으로 교체
            setMessages((prev) => [...prev.slice(0, -1), errorResponse]);
        } finally {
            // (5) 성공하든 실패하든, 로딩 상태를 다시 false로 변경
            setIsLoading(false);
        }
    };

    /**
     * 대화 내역 삭제 요청 시 호출되는 핸들러.
     * 바로 삭제하지 않고 삭제 확인 메시지 UI를 표시하도록 상태를 변경합니다.
    */
    const handleDeleteChatHistoryRequest = () => {
        setShowDeleteConfirmation(true); // 삭제 확인 메시지를 표시하도록 상태 업데이트
    };

    /**
     * 대화 내역 삭제를 최종적으로 확인했을 때 호출되는 핸들러.
     * 메시지 배열을 초기화하여 모든 대화 내역을 삭제합니다.
    */
    const confirmDeleteChatHistory = () => {
        setMessages([]); // 메시지 배열을 빈 배열로 초기화 (모든 대화 삭제)
        setShowDeleteConfirmation(false); // 삭제 확인 메시지 숨김
    };

    /**
     * 대화 내역 삭제를 취소했을 때 호출되는 핸들러.
     * 삭제 확인 메시지 UI를 숨깁니다.
    */
    const cancelDeleteChatHistory = () => {
        setShowDeleteConfirmation(false); // 삭제 확인 메시지 숨김
    };

    /**
     * 메시지 입력 필드에서 키보드 이벤트 발생 시 호출되는 핸들러.
     * Enter 키가 눌렸을 때 메시지 전송 함수를 호출합니다.
    */
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSendMessage();
        }
    };

    // 컴포넌트 렌더링 부분
    return (
        // 전체 알림 패널 컨테이너
        <aside className="w-[300px] h-screen bg-white shadow-sm flex flex-col">
            {/* 알림 패널 헤더 */}
            <div className="h-16 flex items-center justify-center font-semibold shadow-sm flex-shrink-0">
                Notifications
            </div>

            {/* 메인 콘텐츠 영역 (상단 알림, LLM 요약본, 메시지 채팅) */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* LLM 요약본 (채팅) 영역 */}
                <div className="mt-2 flex-1 flex flex-col min-h-0">
                    {/* LLM 요약본 제목과 대화 내역 삭제 버튼 */}
                    <div className="flex items-center justify-between mb-1 px-4">
                        <h3 className="mt-2 font-semibold text-sm">A.P 챗봇</h3>
                        <button
                            onClick={handleDeleteChatHistoryRequest} // 클릭 시 삭제 확인 UI 표시 요청
                            className="text-gray-500 hover:text-red-400 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-300 focus:"
                            aria-label="대화 내역 삭제"
                        >
                            <Trash2 size={16} /> {/* 휴지통 아이콘 */}
                        </button>
                    </div>

                    {/* 채팅 메시지 목록 영역 */}
                    <div className="flex-1 overflow-y-auto px-4 pb-2 mt-2">
                        <div className="space-y-3">
                            {/* messages 배열을 순회하며 각 메시지를 렌더링 */}
                            {messages.map((msg) => (
                                <div
                                    key={msg.id} // 고유 key prop
                                    // 발신자에 따라 메시지 정렬 (사용자: 오른쪽, 봇: 왼쪽)
                                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    {/* ▼▼▼ [핵심 수정] 이 div에 whitespace-pre-wrap 클래스를 추가합니다. ▼▼▼ */}
                                    <div
                                        className={`p-2 rounded-lg text-xs max-w-[80%] break-words whitespace-pre-wrap ${
                                            // 발신자에 따라 배경색 및 텍스트 색상 변경
                                            msg.sender === "user"
                                                ? "bg-gray-200"
                                                : "bg-gray-500 text-white"
                                        }`}
                                    >
                                        {msg.text} {/* 메시지 내용 */}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} /> {/* 스크롤을 맨 아래로 이동시키기 위한 빈 div */}
                        </div>

                        {/* 삭제 확인 메시지 UI 조건부 렌더링 */}
                        {showDeleteConfirmation && (
                            <div className="flex justify-center mt-4">
                                <div className="bg-gray-100 p-4 rounded-lg shadow-md text-center max-w-[90%]">
                                    <p className="mb-3 text-xs text-gray-700 font-medium">
                              모든 대화 내역을 <br/>삭제하시겠습니까?
                           </p>
                                    <p className="mb-3 text-xs text-gray-700 font-medium">대화 내역은 저장되지 않습니다.</p>
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={confirmDeleteChatHistory} // 삭제 확정 버튼
                                            className="bg-red-300 text-gray-800 px-3 py-1 rounded-md text-xs hover:bg-red-400"
                                        >
                                            네! <br/> 삭제합니다.
                                        </button>
                                        <button
                                            onClick={cancelDeleteChatHistory} // 삭제 취소 버튼
                                            className="bg-gray-300 text-gray-800 px-3 py-1 rounded-md text-xs hover:bg-gray-400"
                                        >
                                            아니요! <br/>취소합니다.
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 메시지 입력 및 전송 구역 */}
                    <div className="mt-auto p-4 flex text-sm items-center gap-2 flex-shrink-0 bg-white">
                        <input
                            type="text"
                            placeholder="메시지를 입력하세요"
                            className="flex-1 p-2 text-sm rounded-lg focus:outline-none bg-gray-100"
                            value={inputMessage} // 입력 필드 값은 inputMessage 상태와 바인딩
                            onChange={(e) => setInputMessage(e.target.value)} // 입력 값 변경 시 상태 업데이트
                            onKeyPress={handleKeyPress} // Enter 키 입력 감지
                            disabled={showDeleteConfirmation} // 삭제 확인 메시지 표시 중에는 입력 필드 비활성화
                        />
                        <button
                            onClick={handleSendMessage} // 메시지 전송 버튼
                            className="bg-gray-200 text-white p-2 rounded-lg hover:bg-gray-300 flex items-center justify-center"
                            aria-label="메시지 전송"
                            disabled={showDeleteConfirmation} // 삭제 확인 메시지 표시 중에는 버튼 비활성화
                        >
                            <Send size={16} color="gray"/> {/* 전송 아이콘 */}
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default NotificationPanel; // 컴포넌트 내보내기