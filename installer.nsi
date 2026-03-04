; ==============================================================================
; NSIS Agent Installer Script (Final Cleaned Version)
; ==============================================================================

; 모던 UI 2.0 라이브러리를 사용하여 현대적인 설치 마법사 UI를 구성합니다.
!include "MUI2.nsh"

Unicode true

; --- 기본 정보 정의 ---
!define APP_NAME "AI Network Attack Detector"
!define COMPANY_NAME "MyProject"
!define VERSION "1.0.0"
!define EXE_NAME "Agent_Setup_${VERSION}.exe"
!define AGENT_FOLDER_NAME "agent_installer" # PyInstaller가 생성할 폴더 이름
!define AGENT_EXE_NAME "agent_installer.exe"

; --- MUI 기본 설정 ---
!define MUI_ABORTWARNING ; 사용자가 설치를 중단할 때 경고창을 띄웁니다.
!define MUI_ICON "agent\resources\app_icon.ico"
!define MUI_UNICON "agent\resources\app_icon.ico"

; --- 설치 마법사 페이지 순서 정의 ---
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; --- 제거 마법사 페이지 순서 정의 ---
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; --- 언어 설정 ---
!insertmacro MUI_LANGUAGE "Korean"

; --- 최종 출력 파일 정보 ---
Name "${APP_NAME}"
OutFile "${EXE_NAME}"
InstallDir "$PROGRAMFILES64\AttackDetectionAgent"
RequestExecutionLevel admin # 관리자 권한으로 실행하도록 요청

; ==============================================================================
; 설치 섹션
; ==============================================================================
Section "Install"
    # 설치 경로를 설정합니다. (예: C:\Program Files\AttackDetectionAgent)
    SetOutPath $INSTDIR

    # 설치 진행 상황을 자세히 보여줍니다.
    SetDetailsPrint textonly
    
    # 1. PyInstaller가 만든 폴더의 '모든 내용물'을 설치 경로로 복사합니다.
    # 이 경로는 installer.nsi 파일이 있는 위치를 기준으로 합니다.
    DetailPrint "에이전트 파일을 복사하고 있습니다..."
    File /r "agent\dist\${AGENT_FOLDER_NAME}\*.*"

    # 2. 복사된 agent_installer.exe를 'install' 모드로 실행하여,
    #    모든 내부 설치(Beats, Sysmon, 서비스 등록 등)를 수행합니다.
    #    ExecWait는 해당 작업이 끝날 때까지 기다립니다.
    DetailPrint "필수 구성 요소를 설치하고 서비스를 시작합니다..."
    ExecWait '"$INSTDIR\${AGENT_EXE_NAME}" install'

    # --- '설치된 앱' 목록 등록을 위한 레지스트리 작성 ---
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${COMPANY_NAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayIcon" "$INSTDIR\${AGENT_EXE_NAME}"
    
    # 언인스톨러를 생성합니다.
    WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

; ==============================================================================
; 제거 섹션
; ==============================================================================
Section "Uninstall"
    # --- 1. 모든 관련 서비스를 중지하고 제거합니다 ---
    DetailPrint "모든 관련 서비스를 중지하고 구성 요소를 제거합니다..."
    # agent_installer.exe를 'uninstall' 모드로 실행하여 모든 서비스 중지/제거 및 파일 삭제를 수행합니다.
    ExecWait '"$INSTDIR\${AGENT_EXE_NAME}" uninstall'

    # --- 2. 언인스톨러 자신과 설치 폴더를 삭제합니다 ---
    # 언인스톨러 자신은 재부팅 시 삭제되도록 예약하고, 비어있는 설치 폴더를 삭제합니다.
    Delete /REBOOTOK "$INSTDIR\Uninstall.exe"
    RMDir "$INSTDIR"

    # --- 3. 레지스트리 정보를 삭제합니다 ---
    DetailPrint "프로그램 등록 정보를 삭제합니다..."
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
    
    SetDetailsPrint lastused
    DetailPrint "제거가 완료되었습니다."
SectionEnd
