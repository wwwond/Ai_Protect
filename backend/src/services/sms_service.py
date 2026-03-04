# src/services/sms_service.py
from sdk.api.message import Message
from sdk.exceptions import CoolsmsException
from ..core.config import settings
import aiosmtplib  # [변경] smtplib 대신 aiosmtplib 임포트

async def send_alert_sms(recipient_phone: str, message: str):
    """CoolSMS를 사용하여 보안 알림 SMS를 발송합니다."""
    coolsms_message = Message(settings.coolsms_api_key, settings.coolsms_api_secret)
    data = {'to': recipient_phone, 'from': settings.coolsms_sender_phone, 'text': message}
    try:
        coolsms_message.send(data)
        print(f"SMS sent successfully to {recipient_phone}")
        return True
    except CoolsmsException as e:
        print(f"Failed to send SMS: Code {e.code} - {e.msg}")
        return False