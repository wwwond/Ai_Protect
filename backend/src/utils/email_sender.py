# src/utils/email_sender.py

import smtplib
from email.mime.text import MIMEText
# --- 설정 파일 임포트 ---
from ..core.config import settings # settings 객체 임포트
# -----------------------

# 이메일 발송 설정 (settings 객체에서 가져옴)
SMTP_SERVER = settings.mail_server
SMTP_PORT = settings.mail_port
SMTP_USERNAME = settings.mail_username
SMTP_PASSWORD = settings.mail_password
SENDER_EMAIL = settings.mail_from

def send_email(to_email: str, subject: str, body: str):
    """
    지정된 이메일 주소로 이메일을 전송합니다.
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("경고: SMTP 사용자 이름 또는 비밀번호가 설정되지 않아 이메일을 보낼 수 없습니다.")
        return False

    try:
        msg = MIMEText(body, 'html')
        msg['Subject'] = subject
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        print(f"이메일 전송 성공: '{subject}' to {to_email}")
        return True
    except Exception as e:
        print(f"이메일 전송 실패: {e}")
        return False

# ... (if __name__ == "__main__" 부분은 settings를 사용하여 테스트 코드를 변경)
if __name__ == "__main__":
    test_email = "recipient@example.com" # 실제 이메일 주소로 변경
    test_subject = "비밀번호 재설정 테스트 (Config 사용)"
    test_body = f"<p>안녕하세요. 이것은 테스트 이메일입니다. 발신: {settings.mail_from}</p>"
    send_email(test_email, test_subject, test_body)