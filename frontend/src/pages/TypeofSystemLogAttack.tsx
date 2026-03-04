import React, { useState, useEffect } from "react";
import {
    Database,
    Cpu,
    Shield,
    Bot,
    Key,
    Check,
    Zap,
    Search,
    ShieldCheck,
    Settings,
    ArrowRight,
    User,
} from "lucide-react";

// 공격 유형 정의
const attackTypes = [
    {
        name: "DCOM 공격",
        icon: Cpu,
        color: "bg-emerald-100 text-emerald-800",
    },
    {
        name: "DLL 하이재킹",
        icon: Database,
        color: "bg-blue-100 text-blue-800",
    },
    {
        name: "WMI 공격",
        icon: Bot,
        color: "bg-amber-100 text-amber-800",
    },
    {
        name: "방어 회피 (MSBuild)",
        icon: Shield,
        color: "bg-red-100 text-red-800",
    },
    {
        name: "원격 서비스 공격 (일반)",
        icon: Key,
        color: "bg-lime-100 text-lime-800",
    },
    {
        name: "원격 서비스 공격 (WinRM)",
        icon: Key,
        color: "bg-orange-100 text-orange-800",
    },
    {
        name: "원격 서비스 악용",
        icon: Cpu,
        color: "bg-violet-100 text-violet-800",
    },
    {
        name: "지속성 (계정 생성)",
        icon: User,
        color: "bg-indigo-100 text-indigo-800",
    },
    {
        name: "스케줄 작업 공격",
        icon: Settings,
        color: "bg-sky-100 text-sky-800",
    },
];

// 각 공격 유형에 대한 상세 정보 정의
const attackDetails = {
    "DCOM 공격": {
        concept: [
            <span key="concept-1">
                네트워크상의 다른 컴퓨터에 있는 COM(Component Object Model) 객체를 악용해 {" "}
                <strong className="bg-green-100 rounded-sm px-1 py-[1px]">
                    원격으로 정상 프로세스 권한을 사용한 코드 실행을 시도하는 공격
                </strong>
                입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                1. 공격자는 우선 로컬 관리자 권한 등{" "}
                <strong className="bg-green-100 rounded-sm px-1 py-[1px]">
                    특정 권한을 획득
                </strong>
                합니다.
            </span>,
            <span key="behavior-2">
                2. RPC(135번 포트)를 통해 {" "}
                <strong className="bg-green-100 rounded-sm px-1 py-[1px]">
                    원격 시스템의 COM 객체(예: MMC20.Application, ShellBrowserWindow)를 생성
                </strong>
                합니다.
            </span>,
            <span key="behavior-3">
                3. 해당 객체의 메서드를 호출해 악성 스크립트나 명령을 메모리 상에서 직접 실행합니다.
            </span>,
        ],
        damage: [
            <span key="damage-1">
                <strong className="bg-green-100 rounded-sm px-1 py-[1px]">
                    파일리스(Fileless) 방식
                </strong>
                으로 디스크에 악성 파일을 남기지 않아 탐지를 회피하며, 메모리나 정당한 시스템 프로세스를 악용해 악성 행위를 수행합니다.
            </span>,
            <span key="damage-2">
                <strong className="bg-green-100 rounded-sm px-1 py-[1px]">
                    내부망 측면 이동(Lateral Movement)
                </strong>
                으로 WannaCry 등 랜섬웨어 확산에 악용됩니다.
            </span>,
        ],
        detection: [
            <span key="detection-1">
                네트워크 DPI/IDS로 RPC(135){" "}
                <strong className="bg-green-100 rounded-sm px-1 py-[1px]">
                    포트의 비정상적 DCOM 호출 모니터링
                </strong>
                을 합니다.
            </span>,
            <span key="detection-2">
                Sysmon 네트워크 연결 이벤트
                <strong className="bg-green-100 rounded-sm px-1 py-[1px]">
                    (Event ID 3)
                </strong>
                {" "} 및 Process Create 이벤트
                <strong className="bg-green-100 rounded-sm px-1 py-[1px]">
                    (Event ID 1)
                </strong>
                에서 
                <strong className="bg-green-100 rounded-sm px-1 py-[1px]">
                    rpcss.exe·svchost.exe 이상 행위 분석
                </strong>
                을 합니다.
            </span>,
            <span key="detection-3">
                Windows 보안 이벤트 로그에서 
                <strong className="bg-green-100 rounded-sm px-1 py-[1px]">
                    DCOM 오류(2147942405 등) 및 원격 COM 개체 생성 시도 감지
                </strong>
                 를 합니다.
            </span>,
            <span key="detection-4">
                정상적이지 않은 시간대에 DCOM 서비스 요청 증가 여부를 감지합니다.
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                사용하지 않는 DCOM 응용 프로그램 비활성화(레지스트리 또는 그룹 정책)를 하거나 방화벽으로 135/TCP 접근을 관리·제한을 합니다.
            </span>,
            <span key="countermeasure-2">
                내부망측 RPC 호출은 반드시 인증된 호스트만 허용되도록 네트워크 세분화가 필요하며 권한 상승 취약점 패치를 적용합니다.
            </span>,
        ],
    },
    "DLL 하이재킹": {
        concept: [
            <span key="concept-1">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    응용 프로그램
                </strong>
                이 정상 DLL 대신 공격자가 만든 {" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    악성 DLL을 로드하도록 유도
                </strong>
                하여, 해당 프로그램 권한(심지어 {" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    관리자 권한
                </strong>
                )으로 
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    악성 코드를 실행
                </strong>
                하게 만드는 기법입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                1. Windows는 DLL 로드시 
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    KnownDLLs → 실행 파일 폴더 → System32 → System → Windows 순으로 검색
                </strong>
                합니다.
            </span>,
            <span key="behavior-2">
                2. 공격자는 우선순위가 낮은 디렉터리(예: C:\Temp, 사용자 다운로드 폴더)에 {" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    정상 DLL과 이름이 동일한 악성 DLL을 배치
                </strong>
                합니다.
            </span>,
            <span key="behavior-3">
                3. 프로그램이 {" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    DLL 로드 시점에 해당 경로를 먼저 탐색
                </strong>
                해 악성 DLL을 불러옵니다.
            </span>,
        ],
        damage: [
            <span key="damage-1">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    권한 상승
                </strong>
                {" "} : DLL 내 악성코드가 실행되면 {" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    사용자 권한으로 시스템을 제어
                </strong>
                할 수 있게 됩니다.
            </span>,
            <span key="damage-2">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    지속성
                </strong>
                {" "} : 시스템 혹은 서비스 재시작 시마다 {" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    자동 로드되어 악성 코드를 지속적으로 유지
                </strong>
                됩니다.
            </span>,
        ],
        detection: [
            <span key="detection-1">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    EDR/파일 무결성 검사로 비표준 경로에서 로드된 DLL 모니터링
                </strong>
                을 실시합니다.
            </span>,
            <span key="detection-2">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    Sysmon ImageLoad 이벤트(Event ID 7)에서 프로세스별 DLL 로드 경로 및 해시를 비교
                </strong>
                합니다.
            </span>,
            <span key="detection-3">
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    코드 서명 검증 부재 혹은 위조 서명 DLL 탐지
                </strong>
                를 실시합니다.
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                DLL 검색 경로에 {" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    쓰기 권한 제한(특히 앱 설치 경로 외부)
                </strong>
                하고 {" "}
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    디지털 서명된 DLL만 로드
                </strong>
                하도록 애플리케이션을 강제 구성합니다.
            </span>,
            <span key="countermeasure-2">
                감염된 응용
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    프로그램을 재설치 또는 정상 DLL로 교체
                </strong>
                가 필요하며
                <strong className="bg-blue-100 rounded-sm px-1 py-[1px]">
                    정기적으로 파일 무결성 검사 및 로그 감사를 실시
                </strong>
                해야 합니다.
            </span>,
        ],
    },
    "WMI 공격": {
        concept: [
            <span key="concept-1">
                Windows Management Instrumentation(WMI)의 이벤트 구독 기능을 악용해 지정된 조건(부팅, 특정 시간)에 {" "}
                <strong className="bg-amber-100 rounded-sm px-1 py-[1px]">
                    메모리 상에서 악성 코드를 자동 실행, 파일리스 형태로 은닉 지속성을 확보
                </strong>
                하는 기법입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                1. 공격자는 
                <strong className="bg-amber-100 rounded-sm px-1 py-[1px]">
                    WMI 이벤트 필터, 소비자(Consumer), 바인딩(Binding)을 등록
                </strong>
                합니다.
            </span>,
            <span key="behavior-2">
                (부팅 시(__InstanceModificationEvent), 특정 시간(TimerEvent) 트리거 발생 시 
                <strong className="bg-amber-100 rounded-sm px-1 py-[1px]">
                    악성 PowerShell 스크립트나 VBScript 실행
                </strong>
                )
            </span>,
            <span key="behavior-3">
                2. 레지스트리나 디스크에 파일 흔적을 남기지 않고 
                <strong className="bg-amber-100 rounded-sm px-1 py-[1px]">
                    메모리 내에서만 동작
                </strong>
                합니다.
            </span>,
        ],
        damage: [
            <span key="damage-1">
                재부팅 후에도 자동 실행되어 높은 지속성을 확보함으로써 
                <strong className="bg-amber-100 rounded-sm px-1 py-[1px]">
                    장기간에 걸쳐 시스템에 은밀히 상주
                </strong>
                할 수 있습니다.
            </span>,
            <span key="damage-2">
                파일리스(Fileless) 공격 기법을 통해 전통적인 
                <strong className="bg-amber-100 rounded-sm px-1 py-[1px]">
                    백신(AV) 및 엔드포인트 탐지·대응(EDR) 솔루션을 효과적으로 우회
                </strong>
                하여 보안 시스템에 탐지되지 않은 채 악성 행위를 수행할 수 있습니다.
            </span>,
        ],
        detection: [
            <span key="detection-1">
                Sysmon 이벤트(
                <strong className="bg-amber-100 rounded-sm px-1 py-[1px]">
                    Event ID 19·20·21
                </strong>
                )를 통해 
                <strong className="bg-amber-100 rounded-sm px-1 py-[1px]">
                    WMI 필터, 소비자, 바인딩의 생성 및 수정을 감시
                </strong>
                합니다.
            </span>,
            <span key="detection-2">
                PowerShell 스크립트 블록 로깅을 활성화하여 
                <strong className="bg-amber-100 rounded-sm px-1 py-[1px]">
                    WMI 관련 명령어 실행을 모니터링
                </strong>
                합니다.
            </span>,
            <span key="detection-3">
                Windows 보안 이벤트 로그의 Operational 로그에서 WMI 활동을 분석합니다.
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                의심스러운 
                <strong className="bg-amber-100 rounded-sm px-1 py-[1px]">
                    WMI 이벤트 구독 체계적으로 삭제
                </strong>
                합니다.
            </span>,
            <span key="countermeasure-2">
                WMI 저장소 
                <strong className="bg-amber-100 rounded-sm px-1 py-[1px]">
                    주기적 감사 및 필터·소비자 목록 점검
                </strong>
                합니다.
            </span>,
            <span key="countermeasure-3">
                필요 시 그룹 정책으로 WMI 이벤트 구독 기능을 제한합니다.
            </span>,
        ],
    },
    "방어 회피 (MSBuild)": {
        concept: [
            <span key="concept-1">
                Microsoft의 빌드 도구{" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    msbuild.exe 를 악용
                </strong>
                해 정상 개발자 유틸리티로 위장, {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    악성 XAML/프로젝트 파일을 로딩·컴파일·실행
                </strong>
                함으로써 AV·EDR {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    탐지를 우회하는 기법
                </strong>
                입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                1. 공격자는 {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    .proj 또는 .xaml 확장자로 된 악성 빌드 스크립트를 작성
                </strong>
                합니다.
            </span>,
            <span key="behavior-2">
                2. msbuild.exe 악성파일{" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    .proj /t:Rebuild 형태로 명령어 실행 
                </strong>
                {" "} 시, 정상 빌드 프로세스(msbuild.exe)가 해당 스크립트를 로드하고 실행합니다.
            </span>,
            <span key="behavior-3">
                3. 내부에 포함된 MSBuild Task를 통해{" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    PowerShell 명령, 실행파일 로딩 등이 가능
                </strong>
                하여 디스크에{" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    악성 파일을 남기지 않고 코드 실행
                </strong>
                을 합니다.
            </span>,
        ],
        damage: [
            <span key="damage-1">
                AV·EDR 솔루션이 화이트리스트로{" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    msbuild.exe를 허용하므로 탐지를 우회
                </strong>
                합니다.
            </span>,
            <span key="damage-2">
                기존 개발 툴 남용으로{" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    위장성·은폐성 확보
                </strong>
                하여 피해를 줍니다.
            </span>,
        ],
        detection: [
            <span key="detection-1">
                Sysmon Process Create(Event ID 1)에서 msbuild.exe 실행 시 {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    명령줄 인자(.proj, .xaml) 모니터링
                </strong>
                {" "} 합니다.
            </span>,
            <span key="detection-2">
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    CommandLine 로깅 활성화
                </strong>
                후 빌드 도구의 {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    스크립트 로딩 흔적 감지
                </strong>
                합니다.
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                msbuild.exe 
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    실행 권한
                </strong>
                을 빌드 서버 등 {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    최소한의 호스트로 제한
                </strong>
                해 오용을 방지합니다.
            </span>,
            <span key="countermeasure-2">
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    애플리케이션 화이트리스트 정책
                </strong>
                을 적용해 승인된 프로그램만 실행되도록 합니다.
            </span>,
            <span key="countermeasure-3">
                빌드 로그 및 스크립트에 대한 {" "}
                <strong className="bg-red-100 rounded-sm px-1 py-[1px]">
                    무결성 검사를 활성화
                </strong>
                해 변경 여부를 감지합니다.
            </span>,
        ],
    },
    "원격 서비스 공격 (일반)": {
        concept: [
            <span key="concept-1">
                RDP, SSH, FTP 등 원격 관리용 {" "}
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    서비스의 취약점 또는 탈취된 자격증명을 이용
                </strong>
                해 시스템 
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    내부로 침투하는 모든 형태의 공격
                </strong>
                을 의미합니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    무차별 대입(Brute-Force)
                </strong>
                {" "} : 자동화 도구로 가능한 ID/패스워드 조합 수많이 시도
            </span>,
            <span key="behavior-2">
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    취약점 익스플로잇
                </strong>
                {" "} : RDP BlueKeep(CVE-2019-0708) 등 알려진 CVE를 통한 원격 코드 실행
            </span>,
            <span key="behavior-3">
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    탈취된 자격증명 사용
                </strong>
                {" "} : 피싱·크리덴셜 스터핑을 통한 접속 시도
            </span>,
        ],
        damage: [
            <span key="damage-1">
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    랜섬웨어 유포 및 내부망 확산
                </strong>
                (예: Ryuk, Maze)
            </span>,
            <span key="damage-2">
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    중요 데이터 유출·파괴
                </strong>
            </span>,
        ],
        detection: [
            <span key="detection-1">
                Windows 보안 이벤트(
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    ID 4625
                </strong>
                )에서 {" "}
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    로그인 실패 다발 탐지
                </strong>
                
            </span>,
            <span key="detection-2">
                SSH 로그에서 {" "}
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    비정상적 로그인 시도 패턴
                </strong>
                (짧은 간격 연속 실패) 모니터링
            </span>,
            <span key="detection-3">
                허용되지 않은 {" "}
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    IP/국가의 접속 시도 탐지
                </strong>
                (Geo-IP Filtering)
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                계정 잠금 정책(
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    연속 실패 시 잠금
                </strong>
                ) RDP 포트 변경·내부망{" "}
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    VPN 전용화
                </strong>
            </span>,
            <span key="countermeasure-2">
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    다단계 인증(MFA)
                </strong>
                 도입 접속 허용{" "}
                <strong className="bg-lime-100 rounded-sm px-1 py-[1px]">
                    IP 화이트리스트 관리
                </strong>
            </span>,
        ],
    },
    "원격 서비스 공격 (WinRM)": {
        concept: [
            <span key="concept-1">
                Windows 원격 관리를 위한 PowerShell Remoting(WinRM) 기능을 악용해 
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    IP 화이트리스트 관리
                </strong>
                {" "} 탈취한 자격증명으로 원격에서 명령을 실행, {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    내부망을 은밀히 제어
                </strong>
                하는 공격입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                1. 공격자는 관리자 권한 계정의 {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    자격증명을 확보
                </strong>
                합니다.
            </span>,
            <span key="behavior-2">
                2. WinRM(HTTP 5985/HTTPS 5986) {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    엔드포인트로 접속하여 Invoke-Command, Enter-PSSession 등을 실행
                </strong>
                합니다.
            </span>,
            <span key="behavior-3">
                3. 메모리 상에서 {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    PowerShell 스크립트를 그대로 실행해 파일리스 공격
                </strong>
                이 가능합니다.
            </span>,
        ],
        damage: [
            <span key="damage-1">
                파일리스 형태로 
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    악성 페이로드를 실행
                </strong>
                합니다.
            </span>,
            <span key="damage-1">
                내부망 다수 시스템 동시 제어로 {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    측면 이동 가속이 가능
                </strong>
                해집니다.
            </span>,
        ],
        detection: [
            <span key="detection-1">
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    PowerShell Script Block Logging 활성화 {" "}
                </strong>
                후 원격 스크립트 내용 모니터링
            </span>,
            <span key="detection-2">
                Sysmon Process Create(Event ID 1)에서
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    winrs.exe·powershell.exe 원격 실행 흔적 탐지
                </strong>
            </span>,
            <span key="detection-3">
                WinRM 서비스 접속 로그(
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    Windows Event ID 4648 등
                </strong>
                ) 분석
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                방화벽으로 WinRM 
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    포트 접근 IP 제어
                </strong>
                {" "} / 불필요 시 {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    WinRM 서비스 비활성화
                </strong>
            </span>,
            <span key="countermeasure-2">
                관리 전용 {" "}
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    Jump Server 경유만 허용
                </strong>
                {" "} / 자격증명 보호를 위한
                <strong className="bg-orange-100 rounded-sm px-1 py-[1px]">
                    LAPS(Local Admin Password Solution) 사용
                </strong>
            </span>,
        ],
    },
    "원격 서비스 악용": {
        concept: [
            <span key="concept-1">
                Netlogon 원격 프로토콜(CVE-2020-1472)의 취약점을 이용해 {" "}
                <strong className="bg-violet-100 rounded-sm px-1 py-[1px]">
                    도메인 컨트롤러 인증 과정을 우회, 도메인 관리자 권한을 탈취하거나 컴퓨터 계정 암호를 0(제로) 값으로 변경하는 공격
                </strong>
                입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                1. Netlogon RPC 호출 시 Secure Channel 인증에 사용하는 {" "}
                <strong className="bg-violet-100 rounded-sm px-1 py-[1px]">
                    세션 키를 모두 0으로 설정해 인증을 우회
                </strong>
                합니다.
            </span>,
            <span key="behavior-2">
                2. 도메인 컨트롤러에 컴퓨터 {" "}
                <strong className="bg-violet-100 rounded-sm px-1 py-[1px]">
                    계정 암호를 빈 문자열로 변경하여 완전한 탈취
                </strong>
                수행
            </span>,
            <span key="behavior-3">
                3. 이후 {" "}
                <strong className="bg-violet-100 rounded-sm px-1 py-[1px]">
                    도메인 관리자 권한으로 전사 네트워크 제어
                </strong>
                {" "} 가능
            </span>,
        ],
        damage: [
            <span key="damage-1">
                <strong className="bg-violet-100 rounded-sm px-1 py-[1px]">
                    도메인 컨트롤러 완전 장악
                </strong>
            </span>,
            <span key="damage-1">
                <strong className="bg-violet-100 rounded-sm px-1 py-[1px]">
                    조직 전체의 관리자 권한 탈취 및 영구 백도어 구축
                </strong>
            </span>,
        ],
        detection: [
            <span key="detection-1">
                도메인 컨트롤러 보안 이벤트(ID 5805)에서 Netlogon {" "}
                <strong className="bg-violet-100 rounded-sm px-1 py-[1px]">
                    세션 실패·재설정 로그 모니터링
                </strong>
            </span>,
            <span key="detection-2">
                네트워크 상 Netlogon RPC 트래픽 이상 탐지 및 비인가 호출 차단
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                <strong className="bg-violet-100 rounded-sm px-1 py-[1px]">
                    CVE-2020-1472 패치
                </strong>
                (2020.8.11) 즉시 적용
            </span>,
            <span key="countermeasure-2">
                도메인 컨트롤러에서{" "}
                <strong className="bg-violet-100 rounded-sm px-1 py-[1px]">
                    Netlogon 강화 모드
                </strong>
                (Enforcement Mode) 활성화
            </span>,
            <span key="countermeasure-3">
                SMB Signing 및 Secure RPC 요구사항 강화
            </span>,
        ],
    },
    "지속성 (계정 생성)": {
        concept: [
            <span key="concept-1">
                일단 시스템에 침투한 후,
                <strong className="bg-indigo-100 rounded-sm px-1 py-[1px]">
                    net user·PowerShell·Windows API 등
                </strong>
                을 이용해{" "}
                <strong className="bg-indigo-100 rounded-sm px-1 py-[1px]">
                    새로운 관리자 계정을 생성
                </strong>
                하거나
                <strong className="bg-indigo-100 rounded-sm px-1 py-[1px]">
                    기존 계정을 관리자 그룹에 추가해 영구적으로 접근권을 유지
                </strong>
                하는 기법입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                1. {" "}
                <strong className="bg-indigo-100 rounded-sm px-1 py-[1px]">
                    net user backdoor P@ssw0rd /add 또는 New-LocalUser PowerShell 커맨드
                </strong>
                {" "} 사용
            </span>,
            <span key="behavior-2">
                2. {" "}
                <strong className="bg-indigo-100 rounded-sm px-1 py-[1px]">
                    net localgroup Administrators backdoor /add
                </strong>
                등으로 관리자 권한 부여
            </span>,
            <span key="behavior-3">
                3. 숨김 계정(user$) 생성, 비표시 속성 추가 등을 통해 GUI에서 보이지 않도록 위장
            </span>,
        ],
        damage: [
            <span key="damage-1">
                언제든지 재접속 가능한{" "}
                <strong className="bg-indigo-100 rounded-sm px-1 py-[1px]">
                    백도어 확보
                </strong>
            </span>,
            <span key="damage-1">
                정상 계정으로 {" "}
                <strong className="bg-indigo-100 rounded-sm px-1 py-[1px]">
                    위장해 탐지 회피
                </strong>
            </span>,
        ],
        detection: [
            <span key="detection-1">
                보안 이벤트 로그(
                <strong className="bg-indigo-100 rounded-sm px-1 py-[1px]">
                    ID 4720: 사용자 계정 생성, ID 4728/4732: 그룹 멤버 추가
                </strong>
                    ) 모니터링
            </span>,
            <span key="detection-2">
                SIEM/EDR에서{" "}
                <strong className="bg-indigo-100 rounded-sm px-1 py-[1px]">
                    비정상적 계정 생성 패턴
                </strong>
                (심야·비업무 시간) 알림 설정
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                <strong className="bg-indigo-100 rounded-sm px-1 py-[1px]">
                    비인가 계정 발견 즉시 비활성화 및 비밀번호 강제 재설정
                </strong>
            </span>,
            <span key="countermeasure-2">
                관리자 그룹 정기 감사 및 계정 권한 검증 주기 단축
            </span>,
            <span key="countermeasure-3">
                사용자 계정 {" "}
                <strong className="bg-indigo-100 rounded-sm px-1 py-[1px]">
                    생성 권한 최소화
                </strong>
            </span>,
        ],
    },
    "스케줄 작업 공격": {
        concept: [
            <span key="concept-1">
                Windows Scheduled Task 또는 cron 유사 기능을 이용해, 악성 페이로드를{" "}
                <strong className="bg-sky-100 rounded-sm px-1 py-[1px]">
                    주기적으로 또는 특정 이벤트 시 자동 실행하도록 예약 등록·수정하여 지속성을 확보
                </strong>
                하는 기법입니다.
            </span>,
        ],
        behavior: [
            <span key="behavior-1">
                1. schtasks.exe /Create /SC DAILY /TN "Updater" /TR "powershell -w hidden -c ..."
            </span>,
            <span key="behavior-2">
                2. PowerShell ScheduledJob 모듈(
                <strong className="bg-sky-100 rounded-sm px-1 py-[1px]">
                    Register-ScheduledJob
                </strong>
                ) 활용
            </span>,
            <span key="behavior-3">
                3. 기존 정상 작업(Job) 수정(
                <strong className="bg-sky-100 rounded-sm px-1 py-[1px]">
                    /Change 옵션
                </strong>
                )으로 악성 스크립트 주입
            </span>,
        ],
        damage: [
            <span key="damage-1">
                주기적·자동 실행으로 높은 {" "}
                <strong className="bg-sky-100 rounded-sm px-1 py-[1px]">
                    지속성 확보
                </strong>
            </span>,
            <span key="damage-1">
                사용자 눈에 잘 띄지 않아 {" "}
                <strong className="bg-sky-100 rounded-sm px-1 py-[1px]">
                    장기간 은닉
                </strong>
                가능
            </span>,
        ],
        detection: [
            <span key="detection-1">
                Windows 보안 이벤트(
                <strong className="bg-sky-100 rounded-sm px-1 py-[1px]">
                    ID 4698: 작업 생성, ID 4702: 작업 변경
                </strong>
                ) 모니터링
            </span>,
            <span key="detection-2">
                Task Scheduler 로그에서
                <strong className="bg-sky-100 rounded-sm px-1 py-[1px]">
                    비표준 경로 혹은 의심 스크립트 실행
                </strong>
                추적
            </span>,
            <span key="detection-3">
                스케줄 작업 파일(.job){" "}
                <strong className="bg-sky-100 rounded-sm px-1 py-[1px]">
                    무결성 검사
                </strong>
            </span>,
        ],
        countermeasure: [
            <span key="countermeasure-1">
                작업 생성·수정 
                <strong className="bg-sky-100 rounded-sm px-1 py-[1px]">
                    권한을 관리자 그룹으로 제한
                </strong>
            </span>,
            <span key="countermeasure-2">
                스케줄 작업 목록{" "}
                <strong className="bg-sky-100 rounded-sm px-1 py-[1px]">
                    주기적 감사
                </strong>
                {" "}및 불필요 작업 비활성화
            </span>,
            <span key="countermeasure-3">
                EDR에서 예약 작업 행위 기반 {" "}
                <strong className="bg-sky-100 rounded-sm px-1 py-[1px]">
                    차단 정책
                </strong>
                {" "} 적용
            </span>,
        ],
    },
};

/**
 * 시스템 로그 공격 유형을 표시하고 각 유형에 대한 상세 정보를 제공하는 컴포넌트입니다.
 * 사용자가 탭을 클릭하면 해당 공격 유형의 개념, 동작 방식, 주요 피해, 탐지 방법, 대응 방안이 표시됩니다.
*/
const TypeofSystemLogAttack: React.FC = () => {
    // 현재 선택된 탭의 이름을 저장하는 상태 (기본값은 첫 번째 공격 유형)
    const [selectedTab, setSelectedTab] = useState<string>(attackTypes[0].name);
    // 내용 전환 시 페이드 효과를 위한 키
    const [fadeKey, setFadeKey] = useState(0);

    // 현재 선택된 탭에 해당하는 공격 상세 정보 가져오기
    const detail = attackDetails[selectedTab];

    // selectedTab이 변경될 때마다 fadeKey를 업데이트하여 내용이 다시 렌더링되도록 트리거
    useEffect(() => {
        setFadeKey((prev) => prev + 1);
    }, [selectedTab]);

    return (
        <div className="p-6">
            {/* 제목 */}
            <h1 className="text-2xl font-semibold mb-4">시스템 로그 공격 유형</h1>

            {/* 공격 유형 탭 목록 */}
            <div className="grid grid-cols-5 gap-2 mt-7 mb-4">
                {attackTypes.map(({ name, icon: Icon, color }) => (
                    <button
                        key={name}
                        onClick={() => setSelectedTab(name)}
                        className={`flex items-center justify-center gap-2 px-4 py-2 font-medium text-sm rounded-md transition-colors duration-200
                            ${
                                selectedTab === name
                                    ? `${color} shadow` // 선택된 탭 스타일
                                    : "bg-transparent text-gray-600 hover:bg-gray-100" // 기본 탭 스타일
                            }`}
                    >
                        {/* 탭 아이콘 */}
                        <Icon className="w-4 h-4" />
                        {/* 탭 이름 */}
                        {name}
                    </button>
                ))}
            </div>

            {/* 선택된 공격 유형에 대한 상세 설명 */}
            <div className="space-y-6 pt-1 text-sm">
                {/* 개념 섹션 */}
                <div className="min-h-[40px]">
                    <div className="flex items-center gap-2 mb-1 text-gray-800">
                        <Check className="w-4 h-4" />
                        <strong>개념</strong>
                    </div>
                    {/* 개념 내용 (페이드 효과 적용) */}
                    <div
                        key={`concept-${fadeKey}`}
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
                    {/* 동작 방식 목록 (페이드 효과 적용) */}
                    <ul
                        key={`behavior-${fadeKey}`}
                        className="text-gray-700 mt-2 ml-2 leading-relaxed transition-opacity duration-300 opacity-100"
                    >
                        {detail.behavior.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 주요 피해 섹션 */}
                <div className="min-h-[90px]">
                    <div className="flex items-center gap-2 mb-1 text-gray-800">
                        <Zap className="w-4 h-4" />
                        <strong>주요 피해</strong>
                    </div>
                    {/* 주요 피해 목록 (페이드 효과 적용) */}
                    <ul
                        key={`damage-${fadeKey}`}
                        className="text-gray-700 mt-2 ml-2 leading-relaxed transition-opacity duration-300 opacity-100"
                    >
                        {detail.damage.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                                <ArrowRight className="w-4 h-4 mr-1 text-gray-600 shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 탐지 방법 섹션 */}
                <div className="min-h-[135px]">
                    <div className="flex items-center gap-2 mb-1 text-gray-800">
                        <Search className="w-4 h-4" />
                        <strong>탐지 방법</strong>
                    </div>
                    {/* 탐지 방법 내용 (배열 처리 및 페이드 효과 적용) */}
                    <div
                        key={`detection-${fadeKey}`}
                        className="text-gray-700 mt-2 ml-2 leading-relaxed transition-opacity duration-300 opacity-100"
                    >
                        {Array.isArray(detail.detection)
                            ? detail.detection.map((text, index) => (
                                  <div key={index} className="flex items-start mb-1">
                                      <span>{text}</span>
                                  </div>
                              ))
                            : detail.detection}
                    </div>
                </div>

                {/* 대응 방안 섹션 */}
                <div className="min-h-[60px]">
                    <div className="flex items-center gap-2 mb-1 text-gray-800">
                        <ShieldCheck className="w-4 h-4" />
                        <strong>대응 방안</strong>
                    </div>
                    {/* 대응 방안 내용 (배열 처리 및 페이드 효과 적용) */}
                    <div
                        key={`countermeasure-${fadeKey}`}
                        className="text-gray-700 mt-2 ml-2 leading-relaxed transition-opacity duration-300 opacity-100"
                    >
                        {Array.isArray(detail.countermeasure)
                            ? detail.countermeasure.map((text, index) => (
                                  <div key={index} className="flex items-start mb-1">
                                      <span>{text}</span>
                                  </div>
                              ))
                            : detail.countermeasure}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TypeofSystemLogAttack;