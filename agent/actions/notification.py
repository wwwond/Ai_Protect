# Windows 데스크톱 알림을 표시하는 기능

from winotify import Notification

def show_notification(title: str, msg: str):
    """
    주어진 제목과 메시지로 Windows 데스크톱 알림을 표시합니다.
    """
    try:
        # 알림 객체를 생성합니다.
        toast = Notification(
            app_id="AttackDetectionRemediator",
            title=title,
            msg=msg
        )
        # 알림을 화면에 표시합니다.
        toast.show()
        print(f"알림 표시 성공: {title}")
    except Exception as e:
        print(f"❌ 알림 표시 실패: {e}")