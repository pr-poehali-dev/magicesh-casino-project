"""Регистрация, вход и управление профилем MAGISCESH. action в body: register/login/me/update"""
import json
import os
import random
import string
import secrets
import psycopg2

SCHEMA = "t_p5159120_magicesh_casino_proj"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def gen_login():
    return "user_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=6))

def gen_password():
    return "".join(random.choices(string.ascii_letters + string.digits, k=8))

def gen_token():
    return secrets.token_hex(32)

def r(code, data):
    return {"statusCode": code, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    headers = event.get("headers", {})
    token = headers.get("X-Session-Token", "")
    action = body.get("action", "")

    conn = get_conn()
    cur = conn.cursor()

    if action == "register":
        login = gen_login()
        password = gen_password()
        session_token = gen_token()
        cur.execute(
            f"INSERT INTO {SCHEMA}.users (login, password, balance, session_token) VALUES (%s, %s, 50.00, %s) RETURNING id, balance",
            (login, password, session_token)
        )
        row = cur.fetchone()
        conn.commit()
        cur.close(); conn.close()
        return r(200, {"id": row[0], "login": login, "password": password, "token": session_token, "balance": float(row[1])})

    if action == "login":
        login = body.get("login", "")
        password = body.get("password", "")
        cur.execute(f"SELECT id, balance FROM {SCHEMA}.users WHERE login=%s AND password=%s", (login, password))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return r(401, {"error": "Неверный логин или пароль"})
        new_token = gen_token()
        cur.execute(f"UPDATE {SCHEMA}.users SET session_token=%s WHERE id=%s", (new_token, row[0]))
        conn.commit()
        cur.close(); conn.close()
        return r(200, {"id": row[0], "login": login, "token": new_token, "balance": float(row[1])})

    if action == "me":
        if not token:
            cur.close(); conn.close()
            return r(401, {"error": "Нет токена"})
        cur.execute(f"SELECT id, login, password, balance FROM {SCHEMA}.users WHERE session_token=%s", (token,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return r(401, {"error": "Токен недействителен"})
        cur.close(); conn.close()
        return r(200, {"id": row[0], "login": row[1], "password": row[2], "balance": float(row[3])})

    if action == "update":
        if not token:
            cur.close(); conn.close()
            return r(401, {"error": "Нет токена"})
        cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_token=%s", (token,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return r(401, {"error": "Токен недействителен"})
        uid = row[0]
        new_login = body.get("login")
        new_password = body.get("password")
        if new_login:
            cur.execute(f"UPDATE {SCHEMA}.users SET login=%s WHERE id=%s", (new_login, uid))
        if new_password:
            cur.execute(f"UPDATE {SCHEMA}.users SET password=%s WHERE id=%s", (new_password, uid))
        conn.commit()
        cur.close(); conn.close()
        return r(200, {"ok": True})

    cur.close(); conn.close()
    return r(400, {"error": "Unknown action"})