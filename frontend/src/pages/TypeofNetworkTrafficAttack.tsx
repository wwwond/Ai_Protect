import React, { useState, useEffect } from "react";
import {
    Database, // 데이터베이스 관련 아이콘
    Cpu,      // CPU (컴퓨팅 자원) 관련 아이콘
    Shield,   // 방패 (보안) 관련 아이콘
    Bot,      // 봇 (자동화) 관련 아이콘
    Key,      // 열쇠 (인증) 관련 아이콘
    Check,    // 체크 마크 아이콘
    Zap,      // 번개 (피해) 아이콘
    Search,   // 검색 (탐지) 아이콘
    ShieldCheck, // 보호막 체크 (대응) 아이콘
    Settings, // 설정 (동작 방식) 아이콘
    ArrowRight, // 오른쪽 화살표 아이콘
} from "lucide-react"; // lucide-react에서 아이콘 임포트

// 공격 유형 정의 배열
const attackTypes = [
    { name: "SQL 인젝션", icon: Database, color: "bg-blue-200 text-blue-800" },
    {
        name: "분산 서비스 거부 공격",
        icon: Cpu,
        color: "bg-yellow-100 text-yellow-800",
    },
    {
        name: "크로스 사이트 스크립팅",
        icon: Shield,
        color: "bg-red-200 text-pink-800",
    },
    { name: "악성봇", icon: Bot, color: "bg-purple-200 text-purple-800" },
    {
        name: "무차별 대입 공격",
        icon: Key,
        color: "bg-orange-200 text-orange-800",
    },
];

// 각 공격 유형에 대한 상세 정보 객체
// React.ReactNode[] 타입으로 변경하여 여러 개의 JSX 요소를 배열로 전달 가능
const attackDetails: {
    [key: string]: {
        concept: React.ReactNode[];
        behavior: React.ReactNode[];
        damage: React.ReactNode[];
        detection: React.ReactNode[];
        countermeasure: React.ReactNode[];
    };
} = {
    "SQL 인젝션": {
        concept: [
            <span key="concept-1">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    사용자가 입력하는 값을 조작
                </strong>
                하여,{" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    원래 의도와 다른 데이터베이스 쿼리(SQL)를 실행하도록 만드는 공격
                </strong>
                입니다. <br /> 이를 통해{" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    인증을 우회하거나 데이터베이스에 저장된 모든 정보에 접근
                </strong>
                할 수 있게 됩니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                해커는
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    로그인 창의 ID 입력란
                </strong>에
                ['' OR 1=1] 과 같은
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    특수 구문을 입력
                </strong>
                합니다. <br />
                만약 시스템이 이 입력을 제대로 거르지 못하면, 데이터베이스는 "ID가 '' 이거나, 1=1인(항상 참) 사용자로 로그인시켜줘." 라는 명령으로 잘못 해석하여{" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    관리자 권한을 포함한 계정 접근을 허용
                </strong>
                하게 됩니다.
            </span>,
        ],
        damage: [
            <span key="damage-1">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    개인정보 대량 유출
                </strong>
                {" "} : 공격 성공 시, 데이터베이스에 저장된 모든 사용자의 ID, 암호화된 비밀번호, 연락처 등{" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    민감한 개인정보가 유출
                </strong>
                될 수 있습니다.
            </span>,
            <span key="damage-2">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    데이터 무결성 훼손
                </strong>
                {" "} : 해커가 데이터베이스에 직접 명령을 내릴 수 있게 되어, {" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    중요 정보를 삭제하거나 악의적으로 변조
                </strong>
                할 수 있습니다.
            </span>,
            <span key="damage-3">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    시스템 장악
                </strong>
                {" "} : 데이터베이스의
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    관리자 권한을 탈취
                </strong>
                하여, 데이터베이스를 넘어 {" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    시스템 전체의 제어권을 획득하는 발판으로 사용
                </strong>
                될 수 있습니다.
            </span>,
        ],
        detection: [
            <span key="detection-1">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    Fwd Pkt Len Mean
                </strong> {" "} / {" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    Fwd Pkt Len Max
                </strong>
            </span>,
            <span key="detection-2">
                공격 구문이나 스크립트가 포함되어 평소보다 Forward 패킷의 평균/최대 길이가 비정상적으로 길어지는 패턴을 보조 지표로 활용할 수 있습니다.
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    공격 패턴 탐지 시 즉시 관리자에게 알림
                </strong>
                을 발송하고, 공격을 시도한{" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    출발지 IP를 방화벽에서 자동으로 차단
                </strong>
                합니다.
            </span>,
        ],
    },
    "분산 서비스 거부 공격": {
        concept: [
            <span key="concept-1">
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    수많은 좀비 PC
                </strong>
                (악성코드에 감염되어 해커의 조종을 받는 컴퓨터)를 동원하여
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    특정 웹사이트에 한꺼번에 대량의 접속 신호를 보내는 공격
                </strong>
                입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                해커의 명령을 받은 {" "}
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    수십만 대의 좀비 PC가 동시에 한 사이트에 접속을 시도
                </strong>하면, 해당 사이트의 서버는{" "}
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    처리 용량을 초과하여 마비
                </strong>
                됩니다. <br />
                이는 마치 좁은 가게 입구에 수많은 가짜 손님들이 몰려와 길을 막아, 진짜 손님들이 들어가지 못하는 상황과 같습니다.
            </span>,
        ],
        damage: [
            <span key="damage-1">
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    서비스 가용성 침해
                </strong>
                {" "} : 웹사이트, API 서버 등 {" "}
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    모든 서비스가 외부에서 접속 불가능한 상태
                </strong>
                가 되어 {" "}
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    정상적인 비즈니스 운영이 불가능
                </strong>
                해집니다.
            </span>,
            <span key="damage-2">
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    경제적 및 신뢰도 손실
                </strong>
                {" "} : 서비스 중단으로 인한 직접적인 매출 손실과 함께, 고객 신뢰도 하락으로 인한 장기적인 기업 이미지 훼손을 유발합니다. {" "}
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    중요 정보를 삭제하거나 악의적으로 변조
                </strong>
                할 수 있습니다.
            </span>,
        ],
        detection: [
            <span key="detection-1">
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    Flow Pkts/s (초당 플로우 패킷 수)
                </strong> {" "} / {" "}
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    Flow Byts/s (초당 플로우 바이트 수)
                </strong>
            </span>,
            <span key="detection-2">
                평상시 대비 이 두 지표가 {" "}
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    임계치를 초과하여 급증하는지
                </strong>
                {" "}실시간으로 모니터링합니다. {" "}
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    이는 DDoS 공격의 가장 명백한 징후
                </strong>
                입니다.
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                임계치를 초과하는 트래픽을 유발하는
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    IP들을 실시간으로 탐지하여 자동으로 차단
                </strong>
                하고, 공격 규모에 따라 {" "}
                <strong className="bg-yellow-100 rounded-sm px-1 py-[1px]">
                    단계별 경고 알림을 발송
                </strong>
                합니다.
            </span>,
        ],
    },
    "크로스 사이트 스크립팅": {
        concept: [
            <span key="concept-1">
                공격자가 {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    신뢰할 수 있는 웹사이트
                </strong>
                의 게시판, 댓글창 등에 {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    악성 스크립트 코드를 몰래 심어두는 공격
                </strong>
                입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    사용자가 해당 악성 스크립트가 포함된 게시물을 클릭
                </strong>
                하면, 스크립트는 사용자의 웹 브라우저 내에서 실행됩니다. <br />
                웹 브라우저는{" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    이 스크립트가 원래 웹사이트의 일부라고 착각
                </strong>
                하기 때문에,
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    사용자의 쿠키 정보(자동 로그인 정보 등)나 개인정보를 공격자에게 전송
                </strong>
                하게 됩니다. {" "}
            </span>,
        ],
        damage: [
            <span key="damage-1">
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    계정 도용
                </strong>
                {" "} : 사용자의
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    브라우저에 저장된 세션 쿠키를 탈취
                </strong>
                하여, {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    정상적인 사용자인 것처럼 위장
                </strong>
                하고 계정을 도용할 수 있습니다.
            </span>,
            <span key="damage-2">
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    피싱 및 악성코드 유포
                </strong>
                {" "} : 신뢰된 사이트 내에서 가짜 로그인 페이지를 보여주거나, {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    사용자를 악성 사이트로 유도하여 추가적인 정보를 탈취
                </strong>
                하거나 악성코드를 감염시키는 통로로 악용됩니다.{" "}
            </span>,
        ],
        detection: [
            <span key="detection-1">
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    Fwd Pkt Len Mean
                </strong> {" "} / {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    Fwd Pkt Len Max
                </strong>
            </span>,
            <span key="detection-2">
                공격 구문이나 스크립트가 포함되어 평소보다 Forward 패킷의 평균/최대 길이가 비정상적으로 길어지는 패턴을 보조 지표로 활용할 수 있습니다.
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                CSS 공격으로
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    의심되는 패턴이 포함된 HTTP 요청을 즉시 거부
                </strong>
                하고, {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    반복적으로 공격을 시도하는 IP를 자동으로 차단
                </strong>
                합니다.
            </span>,
        ],
    },
    "악성봇": {
        concept: [
            <span key="concept-1">
                사람의 손을 거치지 않고,
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    특정 작업을 자동으로 반복 수행
                </strong>
                하도록 만들어진
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    악의적인 프로그램
                </strong>
                입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                악성봇은 다양한 형태로 활동합니다. <br />
                다른 곳에서 {" "}
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    유출된 ID와 비밀번호 수백만 개를 여러 사이트에 자동으로 입력해보며 로그인을 시도
                </strong>
                하거나(Credential Stuffing), <br />
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    웹사이트의 정보를 무단으로 대량 복제(Scraping)
                </strong>
                하고, {" "}
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    DDoS 공격의 좀비 PC 역할을 수행
                </strong>
                하기도 합니다.
            </span>,
        ],
        damage: [
            <span key="damage-1">
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    자격 증명 스터핑(Credential Stuffing)
                </strong>
                {" "} : 다른 곳에서
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    유출된 ID/비밀번호 목록을 이용한 대량의 자동 로그인 시도
                </strong>
                로 사용자 계정을 탈취합니다.
            </span>,
            <span key="damage-2">
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    콘텐츠 불법 복제
                </strong>
                {" "} : 웹사이트의 콘텐츠나 가격
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    정보 등을 무단으로 대량 수집(Scraping)
                </strong>
                하여 비즈니스 경쟁력을 약화시킵니다.
            </span>,
            <span key="damage-3">
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    자원 고갈 및 공격 기반
                </strong>
                {" "} :
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    DDoS 공격의 좀비 PC로 활용
                </strong>
                되거나, 스팸 메일 발송 등 추가적인
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    공격의 기반
                </strong>
                이 됩니다.
            </span>,
        ],
        detection: [
            <span key="detection-1">
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    Flow IAT Mean
                </strong> {" "} / {" "}
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    Idle Min
                </strong>
            </span>,
            <span key="detection-2">
                봇은 프로그램이므로 {" "}
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    패킷 간 간격(Flow IAT Mean)이나 유휴 시간(Idle Min)이 매우 규칙적이고 거의 변화가 없는 패턴
                </strong>
                을 보입니다. <br />
                이러한 {" "}
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    시간 통계의 표준편차가 0에 가까운 플로우를 탐지
                </strong>
                합니다.
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                AI 모델이
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    비정상적인 행위 패턴을 보이는 IP를 '봇 의심'으로 분류
                </strong>
                하고, 해당 {" "}
                <strong className="bg-purple-100 rounded-sm px-1 py-[1px]">
                    IP의 요청 속도를 제한(Rate Limiting)
                </strong>
                하여 활동을 방해합니다.
            </span>,
        ],
    },
    "무차별 대입 공격": {
        concept: [
            <span key="concept-1">
                특정 계정의 비밀번호를 알아내기 위해, {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    가능한 모든 문자 조합을 하나씩 순서대로 대입
                </strong>
                해보는 {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    가장 단순하고 직접적인 공격
                </strong>
                {" "} 방식입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                공격자는 자동화된 프로그램을 사용해 '1234', 'abcd', 'password' 와 같은 단순한 비밀번호부터 시작하여, 가능한 모든 조합을 매우 빠른 속도로 시도합니다. <br />
                사용자가 {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    쉽고 짧은 비밀번호를 사용
                </strong>
                하고 있다면, {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    이 공격에 매우 취약
                </strong>
                합니다.
            </span>,
        ],
        damage: [
            <span key="damage-1">
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    계정 탈취
                </strong>
                {" "} : 자동화된 프로그램을 통해
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    아이디와 비밀번호를 무차별적으로 대입
                </strong>
                하여 사용자 {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    계정의 제어권을 직접적으로 탈취
                </strong>
                합니다.
            </span>,
            <span key="damage-2">
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    서비스 장애 유발
                </strong>
                {" "} : 반복적인 로그인 시도로 인해
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    인증 서버에 과도한 부하를 유발
                </strong>
                하거나, {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    잦은 계정 잠금으로 정상 사용자의 서비스 이용을 방해
                </strong>
                합니다.
            </span>,
        ],
        detection: [
            <span key="detection-1">
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    Dst Port
                </strong>
            </span>,
            <span key="detection-2">
                SSH(22), FTP(21), RDP(3389) 등 {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    특정 인증 서비스 포트로 향하는 짧은 Flow Duration을 가진 연결 시도가 단시간에 여러 번 발생하는지 탐지
                </strong>
                합니다.
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    단시간 내에 로그인 실패 횟수가 임계치를 초과
                </strong>
                하면 해당 {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    IP를 자동으로 차단
                </strong>
                하고, 특정 계정에 대한 반복적인 실패 시 {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    해당 계정을 잠금 처리
                </strong>
                합니다.
            </span>,
        ],
    },
};

// TypeofNetworkTrafficAttack React 함수형 컴포넌트 정의
const TypeofNetworkTrafficAttack: React.FC = () => {
    // 현재 선택된 탭의 이름을 저장하는 상태. 초기값은 attackTypes 배열의 첫 번째 요소 이름
    const [selectedTab, setSelectedTab] = useState<string>(attackTypes[0].name);
    // 내용 전환 시 페이드 효과를 위한 key 값. 이 값이 변경되면 컴포넌트가 다시 마운트된 것처럼 동작하여 CSS transition이 발동
    const [fadeKey, setFadeKey] = useState(0);

    // 선택된 탭에 해당하는 상세 정보
    const detail = attackDetails[selectedTab];

    // selectedTab이 변경될 때마다 fadeKey를 업데이트하여 내용에 페이드 효과 적용
    useEffect(() => {
        setFadeKey((prev) => prev + 1);
    }, [selectedTab]);

    return (
        <div className="p-6">
            {/* 페이지 제목 */}
            <h1 className="text-2xl font-semibold mb-4">네트워크 트래픽 공격 유형</h1>

            {/* 탭 네비게이션 */}
            <div className="flex mt-7 mb-4 gap-2">
                {attackTypes.map(({ name, icon: Icon, color }) => ( // 각 공격 유형을 버튼으로 렌더링
                    <button
                        key={name}
                        onClick={() => setSelectedTab(name)} // 클릭 시 해당 탭 선택
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 font-medium text-sm rounded-md transition-colors duration-200
                            ${
                                selectedTab === name
                                    ? `${color} shadow` // 선택된 탭의 스타일
                                    : "bg-transparent text-gray-600 hover:bg-gray-100" // 선택되지 않은 탭의 스타일
                            }`}
                    >
                        <Icon className="w-5 h-5" /> {/* 탭 아이콘 */}
                        {name} {/* 탭 이름 */}
                    </button>
                ))}
            </div>

            {/* 공격 유형별 상세 설명 섹션 */}
            <div className="space-y-6 pt-4 text-sm">
                {/* 개념 섹션 */}
                <div className="min-h-[100px]">
                    <div className="flex items-center gap-2 mb-1 text-gray-800">
                        <Check className="w-4 h-4" />
                        <strong>개념</strong>
                    </div>
                    <div
                        key={`concept-${fadeKey}`} // fadeKey를 사용하여 내용 변경 시 페이드 효과 적용
                        className="text-gray-700 mt-2 ml-2 leading-relaxed transition-opacity duration-300 opacity-100"
                    >
                        {detail.concept}
                    </div>
                </div>

                {/* 동작 방식 섹션 */}
                <div className="min-h-[100px]">
                    <div className="flex items-center gap-2 mb-1 text-gray-800">
                        <Settings className="w-4 h-4" />
                        <strong>동작 방식</strong>
                    </div>
                    <div
                        key={`behavior-${fadeKey}`} // fadeKey를 사용하여 내용 변경 시 페이드 효과 적용
                        className="text-gray-700 mt-2 ml-2 leading-relaxed transition-opacity duration-300 opacity-100"
                    >
                        {detail.behavior}
                    </div>
                </div>

                {/* 주요 피해 섹션 */}
                <div className="min-h-[120px]">
                    <div className="flex items-center gap-2 mb-1 text-gray-800">
                        <Zap className="w-4 h-4" />
                        <strong>주요 피해</strong>
                    </div>
                    <ul
                        key={`damage-${fadeKey}`} // fadeKey를 사용하여 내용 변경 시 페이드 효과 적용
                        className="text-gray-700 mt-2 ml-2 leading-relaxed"
                    >
                        {detail.damage.map((item, idx) => ( // 피해 목록을 순회하며 렌더링
                            <li key={idx} className="flex items-center gap-1">
                                <ArrowRight className="w-4 h-4 mr-1 text-gray-600 shrink-0" /> {/* 목록 아이콘 */}
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 탐지 방법 섹션 */}
                <div className="min-h-[100px]">
                    <div className="flex items-center gap-2 mb-1 text-gray-800">
                        <Search className="w-4 h-4" />
                        <strong>탐지 방법</strong>
                    </div>

                    <div
                        key={`detection-${fadeKey}`} // fadeKey를 사용하여 내용 변경 시 페이드 효과 적용
                        className="text-gray-700 mt-2 ml-2 leading-relaxed transition-opacity duration-300 opacity-100"
                    >
                        {Array.isArray(detail.detection) // detection이 배열인 경우 각 항목을 렌더링
                            ? detail.detection.map((text, index) => (
                                <div key={index} className="flex items-start mb-1">
                                    {index === 1 && ( // 두 번째 항목에만 화살표 아이콘 추가
                                        <ArrowRight className="w-4 h-4 ml-1 mr-[4px] text-gray-600 shrink-0 mt-[3px]" />
                                    )}
                                    <span>{text}</span>
                                </div>
                            ))
                            : detail.detection} {/* 배열이 아닌 경우 그대로 렌더링 */}
                    </div>
                </div>

                {/* 대응 방안 섹션 */}
                <div className="min-h-[64px]">
                    <div className="flex items-center gap-2 mb-1 text-gray-800">
                        <ShieldCheck className="w-4 h-4" />
                        <strong>대응 방안</strong>
                    </div>
                    <div
                        key={`countermeasure-${fadeKey}`} // fadeKey를 사용하여 내용 변경 시 페이드 효과 적용
                        className="text-gray-700 mt-2 ml-2 leading-relaxed transition-opacity duration-300 opacity-100"
                    >
                        {detail.countermeasure}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TypeofNetworkTrafficAttack;