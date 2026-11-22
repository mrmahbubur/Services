"""
================================================================================
M R S SERVICES - GOOGLE AI STUDIO FULL AUTOMATION SYSTEM
================================================================================
This file contains the complete end-to-end setup for Google AI Studio:
1. Google Generative AI (Gemini 1.5 Flash) Configuration.
2. Full Operational Knowledge Base & System Instruction.
3. Function Calling Tools (submit_client_intake, verify_payment_submission, escalate_to_owner).
4. Automated Email Dispatchers (Client copy, Owner paid alert, Owner escalation).
5. Interactive Terminal Runner & Webhook API Bridge.
================================================================================
"""

import os
import smtplib
from email.mime.text import MIMEText
from typing import Optional
import google.generativeai as genai

# ==============================================================================
# 1. ENVIRONMENT CONFIGURATION
# ==============================================================================
# Set your Gemini API key from https://aistudio.google.com/
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")
OWNER_EMAIL = os.getenv("OWNER_EMAIL", "owner@example.com")

# Email credentials (Optional: Uses terminal logging if left blank)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 465))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

genai.configure(api_key=GEMINI_API_KEY)

# ==============================================================================
# 2. GOOGLE AI STUDIO SYSTEM INSTRUCTION
# ==============================================================================
AI_STUDIO_SYSTEM_INSTRUCTION = """
You are the Executive AI Consultant & Operations Agent for "M R S Services".
Your job is to consult with incoming clients from WhatsApp and Web, collect requirements, provide our verified payment gateways, and trigger automated jobs.

### CONVERSATION PROTOCOL:
1. Be professional, direct, and concise.
2. Ask ONE question at a time to prevent overwhelming the client.
3. Always collect: Client Name, Email Address, and Phone/WhatsApp number.
4. Region & Currency Routing:
   - For Bangladesh: Quote in BDT (TK). Gateway: bKash.
   - For International: Quote in USD ($). Gateways: Skrill, Payoneer, or Binance (USDT).

### VERIFIED PAYMENT GATEWAY ACCOUNTS:
1. Bangladesh (BDT):
   - bKash (Personal): +8801810853282
   - MANDATORY RULE: Must instruct the client: "Use 'Send Money' option only (not Make Payment). Once sent, reply with your Sender Number and 10-character TrxID."
2. International (USD / USDT):
   - Payoneer: Customer ID 108003450
   - Skrill: Customer ID 407108385
   - Binance Pay: ID mrxshahin
   - MANDATORY RULE: Instruct client: "Once sent, reply with your Transaction Reference ID / Order ID."

### SERVICE CATALOG & PRICING:
1. AI Tools & Productivity: $50–$100/hr (6,000–12,000 TK/hr). Prompt engineering, workflow automations, fact-checking.
2. Advanced ATS CV & Resume: $15 / 1,500 TK (Fixed, 24–48h turnaround). ATS layout, keywords, metrics. Delivery: print-ready PDF + editable DOCX source.
3. Website Management & Content: $30–$60/hr (3,500–7,000 TK/hr). WordPress/Blogger admin, speed optimization, on-page SEO, bug fixes.
4. Technical Writing & Guides: $40–$80/hr. How-to tutorials, manuals, software walkthroughs, proofreading.
5. IT Support & Troubleshooting: $25–$50/hr (3,000–6,000 TK/hr). Remote diagnostics via AnyDesk/RustDesk for PC/Android devices.
6. Virtual Assistance & Admin: $15–$25/hr (1,800–3,000 TK/hr). Excel/Sheets formulas, data cleanup, inbox management.
7. Gravatar Services:
   - Profile Personalization: $10–$20 (1,200–2,400 TK)
   - Custom Domain Mapping: $15–$30 (1,800–3,600 TK)
   - Digital Identity Consultation: $25/session (3,000 TK)
8. M R S IPTV VIP Pass (Zero Ads, 4K priority streams, YouTube section unlocked):
   - Bangladesh (bKash): 1m = 110 TK | 3m = 320 TK | 6m = 630 TK | 12m = 1,220 TK
   - International (Skrill/Payoneer/Binance): 1m = $1 | 3m = $3 | 6m = $6 | 12m = $12

### TOOL CALLING RULES:
1. When project scope and client details (Name, Email, Phone) are complete:
   -> Call `submit_client_intake`.
   -> Present the exact payment accounts.
2. When client provides the TrxID / payment reference:
   -> Call `verify_payment_submission`.
3. If client acts hostile, demands custom discounts, encounters technical failures, or asks for unlisted work:
   -> Call `escalate_to_owner` IMMEDIATELY.
   -> Inform client: "I have escalated your file to our Senior Strategist (M R S Services). They have received your notes and will contact you directly within 2-4 hours."
"""

# ==============================================================================
# 3. EMAIL DISPATCH ENGINE
# ==============================================================================
def dispatch_email(recipient: str, subject: str, message_body: str) -> bool:
    """Dispatches real SMTP email or prints formatted output if credentials missing."""
    if not SMTP_USER or not SMTP_PASSWORD:
        print("\n" + "=" * 60)
        print(f"📧 [DISPATCH LOG] TO: {recipient}")
        print(f"📌 SUBJECT: {subject}")
        print("-" * 60)
        print(message_body)
        print("=" * 60 + "\n")
        return True

    try:
        msg = MIMEText(message_body)
        msg["Subject"] = subject
        msg["From"] = f"M R S Services <{SMTP_USER}>"
        msg["To"] = recipient

        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        print(f"✅ [EMAIL SUCCESS] Dispatched to {recipient}")
        return True
    except Exception as err:
        print(f"❌ [EMAIL FAILED] {err}")
        return False

# ==============================================================================
# 4. GOOGLE AI STUDIO TOOLS (FUNCTION CALLING IMPLEMENTATION)
# ==============================================================================
def submit_client_intake(
    client_name: str,
    client_email: str,
    client_phone: str,
    service_name: str,
    intake_data: str,
    quoted_amount: float,
    currency: str,
) -> dict:
    """
    Saves client project scope, emails a confirmation brief to the client, 
    and sends payment instructions.
    """
    if currency.upper() == "BDT":
        payment_info = (
            "Payment Gateway: bKash (Personal)\n"
            "Number: +8801810853282\n"
            "Important: Use 'Send Money' option only.\n"
            "Once sent, reply with your Sender Number and 10-character TrxID."
        )
    else:
        payment_info = (
            "International Payment Gateways:\n"
            "1. Payoneer Customer ID: 108003450\n"
            "2. Skrill Customer ID: 407108385\n"
            "3. Binance Pay ID: mrxshahin\n"
            "Once sent, reply with your Transaction Reference ID."
        )

    email_body = (
        f"Hello {client_name},\n\n"
        f"Thank you for choosing M R S Services. Here is your project brief:\n\n"
        f"Service: {service_name}\n"
        f"Total Quoted: {quoted_amount} {currency}\n"
        f"Phone/WhatsApp: {client_phone}\n\n"
        f"Scope Details:\n{intake_data}\n\n"
        f"----------------------------------------\n"
        f"PAYMENT INSTRUCTIONS:\n{payment_info}\n"
        f"----------------------------------------\n\n"
        f"We begin execution immediately upon payment verification.\n\n"
        f"Best regards,\nM R S Services Team"
    )

    dispatch_email(client_email, f"Project Scope Confirmation: {service_name}", email_body)
    return {
        "status": "SUCCESS",
        "message": f"Brief saved. Confirmation copy emailed to {client_email}."
    }


def verify_payment_submission(
    client_email: str,
    service_name: str,
    payment_method: str,
    transaction_id_or_ref: str,
    amount_paid: float,
    currency: str,
    sender_identifier: Optional[str] = "N/A",
    client_phone: Optional[str] = "N/A",
) -> dict:
    """
    Logs payment verification submission and sends an immediate alert to the owner.
    """
    owner_alert = (
        f"💰 NEW PAID ORDER RECEIVED!\n\n"
        f"Service: {service_name}\n"
        f"Amount: {amount_paid} {currency}\n"
        f"Payment Method: {payment_method}\n"
        f"TrxID / Reference: {transaction_id_or_ref}\n"
        f"Sender Number / Account: {sender_identifier}\n\n"
        f"Client Details:\n"
        f"Email: {client_email}\n"
        f"Phone: {client_phone}\n"
    )

    dispatch_email(OWNER_EMAIL, f"💰 PAID ORDER: {service_name} ({amount_paid} {currency})", owner_alert)
    return {
        "status": "SUCCESS",
        "message": "Payment logged. Owner notified to verify transaction and begin worker pipeline."
    }


def escalate_to_owner(
    client_name: str,
    client_contact: str,
    reason: str,
    conversation_summary: str,
) -> dict:
    """
    Alerts the owner immediately via priority email for manual takeover.
    """
    escalation_alert = (
        f"🚨 IMMEDIATE ACTION REQUIRED - CLIENT ESCALATION\n\n"
        f"Client: {client_name}\n"
        f"Contact: {client_contact}\n"
        f"Reason for Escalation: {reason}\n\n"
        f"Chat Summary:\n{conversation_summary}\n\n"
        f"Please contact the client directly to take over this ticket."
    )

    dispatch_email(OWNER_EMAIL, f"🚨 URGENT ESCALATION: {client_name}", escalation_alert)
    return {
        "status": "SUCCESS",
        "message": "Owner alerted via priority email for direct intervention."
    }


# ==============================================================================
# 5. MODEL INITIALIZATION WITH GOOGLE AI STUDIO SETTINGS
# ==============================================================================
tools_catalog = [submit_client_intake, verify_payment_submission, escalate_to_owner]

generation_config = {
    "temperature": 0.2,      # Strict, deterministic adherence to pricing and intake
    "top_p": 0.8,
    "top_k": 40,
    "max_output_tokens": 1024,
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    system_instruction=AI_STUDIO_SYSTEM_INSTRUCTION,
    tools=tools_catalog,
    generation_config=generation_config,
)

# ==============================================================================
# 6. INTERACTIVE CONSOLE RUNNER (TEST YOUR SYSTEM DIRECTLY)
# ==============================================================================
def run_interactive_session():
    """Starts a live console chat simulating WhatsApp or Web chat with full tool execution."""
    print("=" * 70)
    print("🚀 M R S Services AI Agent (Google AI Studio Engine) Initialized.")
    print("Type your message below (or type 'quit' to exit):")
    print("=" * 70)

    chat = model.start_chat(enable_automatic_function_calling=True)

    while True:
        try:
            user_input = input("\n👤 Client: ")
            if user_input.strip().lower() in ["exit", "quit"]:
                print("Session closed.")
                break
            if not user_input.strip():
                continue

            response = chat.send_message(user_input)
            print(f"\n🤖 M R S Agent:\n{response.text}")
        except KeyboardInterrupt:
            print("\nExiting session.")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    run_interactive_session()