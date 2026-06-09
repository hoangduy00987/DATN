import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_reset_password_email(email: str, token: str):
    """
    Sends a password reset email to the user.
    """
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        print("Skipping email sending: MAIL_USERNAME or MAIL_PASSWORD not configured.")
        return

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    subject = "Reset mật khẩu - Hệ thống chẩn đoán bệnh phổi"
    body = f"""
    <html>
    <body>
        <p>Chào bạn,</p>
        <p>Chúng tôi nhận được yêu cầu cài đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email này.</p>
        <p>Để cài đặt lại mật khẩu, vui lòng nhấn vào liên kết bên dưới:</p>
        <p><a href="{reset_link}">{reset_link}</a></p>
        <p>Nếu bạn không yêu cầu cài đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        <p>Trân trọng,<br>Đội ngũ Hệ thống chẩn đoán bệnh phổi</p>
    </body>
    </html>
    """

    message = MIMEMultipart()
    message["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
    message["To"] = email
    message["Subject"] = subject
    message.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
            server.starttls()
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.send_message(message)
    except Exception as e:
        print(f"Error sending email: {e}")
        # In actual production, we might want to log this properly or raise an exception
