import base64
import hashlib
import hmac
import json
import logging
import time

from fastapi import HTTPException

from .config import SESSION_SECRET

logger = logging.getLogger(__name__)


def sign_payload(payload: dict, secret: str) -> str:
    payload_str = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_str.encode('utf-8')).decode('utf-8')
    signature = hmac.new(secret.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode('utf-8')
    return f"{payload_b64}.{signature_b64}"


def verify_token(token: str, secret: str) -> dict | None:
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, signature_b64 = parts

        expected_sig = hmac.new(secret.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode('utf-8')

        if not hmac.compare_digest(signature_b64, expected_sig_b64):
            return None

        payload_str = base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8')
        payload = json.loads(payload_str)

        if "exp" in payload and time.time() > payload["exp"]:
            return None

        return payload
    except (ValueError, json.JSONDecodeError) as e:
        logger.warning("Could not decode session token: %s", e)
        return None


def get_user_from_token(token: str) -> dict | None:
    if not token:
        return None

    return verify_token(token, SESSION_SECRET)


def enforce_authentication(authorization: str = None):
    # Permissive authentication: allows guest access if no authorization header is provided
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.split(" ")[1]
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session token. Please log in again.")
    return user


def create_session_token(user_info: dict) -> str:
    return sign_payload(user_info, SESSION_SECRET)
