# src/services/email_service.py
import aiosmtplib
from email.message import EmailMessage
from ..core.config import settings

async def send_alert_email(recipient_email: str, subject: str, body: str):
    """SMTP를 사용하여 보안 알림 이메일을 비동기적으로 발송합니다."""
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = settings.mail_from
    msg['To'] = recipient_email
    msg.set_content(body)

    try:
        # 포트 번호에 따라 SSL/TLS 사용 여부를 자동으로 결정합니다.
        use_ssl = settings.mail_port == 465

        # ▼▼▼ [핵심 수정] message 인자를 키워드 없이 위치에 맞게 전달하도록 수정합니다. ▼▼▼
        await aiosmtplib.send(
            msg,  # 'message=' 부분을 제거하고 값만 전달
            hostname=settings.mail_server,
            port=settings.mail_port,
            username=settings.mail_username,
            password=settings.mail_password,
            use_tls=use_ssl,
            start_tls=not use_ssl
        )
        print(f"✅ 이메일 발송 성공: {recipient_email}")
        return True
            
    except Exception as e:
        print(f"❌ 이메일 발송 실패: {e}")
        return False
