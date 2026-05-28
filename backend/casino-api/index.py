"""
MAGISCESH Casino API. Маршрутизация через поле action в теле запроса.
Действия: register, login, me, update_profile, deposit, get_deposits,
withdraw, get_withdrawals, update_balance, admin_login, admin_deposits,
admin_withdrawals, admin_approve_deposit, admin_reject_deposit,
admin_approve_withdrawal, admin_reject_withdrawal
"""
import json
import os
import secrets
import string
import random
import hashlib
import psycopg2
from datetime import datetime, timedelta

SCHEMA = "t_p5159120_magicesh_casino_proj"
ADMIN_PASSWORD = "2007qwerQ"
BEELINE_PHONE = "79629031556"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
    "Content-Type": "application/json"
}

def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, ensure_ascii=False, default=str)}

def err(msg, code=400):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}

def hash_pwd(pwd):
    return hashlib.sha256(pwd.encode()).hexdigest()

def gen_token():
    return secrets.token_hex(32)

def gen_login():
    return "user" + "".join(random.choices(string.digits, k=6))

def gen_password():
    return "".join(random.choices(string.ascii_letters + string.digits, k=10))

def get_user(cur, token):
    cur.execute(
        f"SELECT id, login, balance, display_name FROM {SCHEMA}.users WHERE session_token = %s",
        (token,)
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "login": row[1], "balance": float(row[2] or 0), "display_name": row[3]}

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    headers = event.get("headers", {}) or {}
    auth = headers.get("X-Authorization", "") or headers.get("Authorization", "") or ""
    token = auth.replace("Bearer ", "").strip()
    action = body.get("action", "ping")

    db = get_db()
    cur = db.cursor()

    try:
        # ping / health-check
        if action == "ping":
            return ok({"status": "ok"})

        # ── REGISTER ─────────────────────────────
        if action == "register":
            login = gen_login()
            password = gen_password()
            tok = gen_token()
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (login, password, balance, session_token) "
                f"VALUES (%s, %s, 50.00, %s) RETURNING id",
                (login, hash_pwd(password), tok)
            )
            uid = cur.fetchone()[0]
            db.commit()
            return ok({"login": login, "password": password, "token": tok,
                       "user_id": uid, "balance": 50.0})

        # ── LOGIN ─────────────────────────────────
        if action == "login":
            login = str(body.get("login", "")).strip()
            password = str(body.get("password", "")).strip()
            if not login or not password:
                return err("Введите логин и пароль")
            cur.execute(
                f"SELECT id, balance, display_name FROM {SCHEMA}.users "
                f"WHERE login = %s AND password = %s",
                (login, hash_pwd(password))
            )
            row = cur.fetchone()
            if not row:
                return err("Неверный логин или пароль")
            uid, bal, dname = row
            tok = gen_token()
            cur.execute(f"UPDATE {SCHEMA}.users SET session_token = %s WHERE id = %s", (tok, uid))
            db.commit()
            return ok({"token": tok, "user_id": uid, "login": login,
                       "balance": float(bal or 0), "display_name": dname})

        # ── ME ────────────────────────────────────
        if action == "me":
            if not token:
                return err("Не авторизован", 401)
            user = get_user(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            return ok(user)

        # ── UPDATE PROFILE ────────────────────────
        if action == "update_profile":
            if not token:
                return err("Не авторизован", 401)
            user = get_user(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            new_login = str(body.get("login", "")).strip()
            new_password = str(body.get("password", "")).strip()
            new_name = str(body.get("display_name", "")).strip()
            if new_login:
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE login = %s AND id != %s",
                            (new_login, user["id"]))
                if cur.fetchone():
                    return err("Этот логин уже занят")
                cur.execute(f"UPDATE {SCHEMA}.users SET login = %s WHERE id = %s",
                            (new_login, user["id"]))
            if new_password:
                cur.execute(f"UPDATE {SCHEMA}.users SET password = %s WHERE id = %s",
                            (hash_pwd(new_password), user["id"]))
            if new_name:
                cur.execute(f"UPDATE {SCHEMA}.users SET display_name = %s WHERE id = %s",
                            (new_name, user["id"]))
            db.commit()
            return ok({"success": True})

        # ── UPDATE BALANCE (игровой) ──────────────
        if action == "update_balance":
            if not token:
                return err("Не авторизован", 401)
            user = get_user(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            new_balance = body.get("balance")
            if new_balance is None:
                return err("Укажите баланс")
            new_balance = max(0.0, float(new_balance))
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = %s WHERE id = %s",
                        (new_balance, user["id"]))
            db.commit()
            return ok({"balance": new_balance})

        # ── DEPOSIT ───────────────────────────────
        if action == "deposit":
            if not token:
                return err("Не авторизован", 401)
            user = get_user(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            amount = float(body.get("amount", 0))
            if amount < 100:
                return err("Минимальная сумма пополнения 100₽")
            cur.execute(
                f"INSERT INTO {SCHEMA}.deposits (user_id, amount, status) "
                f"VALUES (%s, %s, 'pending') RETURNING id",
                (user["id"], amount)
            )
            dep_id = cur.fetchone()[0]
            db.commit()
            return ok({"deposit_id": dep_id, "amount": amount,
                       "beeline_phone": BEELINE_PHONE, "status": "pending"})

        # ── GET DEPOSITS ──────────────────────────
        if action == "get_deposits":
            if not token:
                return err("Не авторизован", 401)
            user = get_user(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            cur.execute(
                f"SELECT id, amount, status, created_at FROM {SCHEMA}.deposits "
                f"WHERE user_id = %s ORDER BY created_at DESC LIMIT 20",
                (user["id"],)
            )
            rows = cur.fetchall()
            return ok({"deposits": [
                {"id": r[0], "amount": float(r[1]), "status": r[2], "created_at": str(r[3])}
                for r in rows
            ]})

        # ── WITHDRAW ──────────────────────────────
        if action == "withdraw":
            if not token:
                return err("Не авторизован", 401)
            user = get_user(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            amount = float(body.get("amount", 0))
            bank = str(body.get("bank", "")).strip()
            sbp_number = str(body.get("sbp_number", "")).strip()
            if amount <= 0:
                return err("Укажите сумму вывода")
            if not bank or not sbp_number:
                return err("Выберите банк и введите номер СБП")
            if user["balance"] < amount:
                return err("Недостаточно средств на балансе")
            week_ago = datetime.now() - timedelta(days=7)
            cur.execute(
                f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.deposits "
                f"WHERE user_id = %s AND status = 'approved' AND approved_at >= %s",
                (user["id"], week_ago)
            )
            total_dep = float(cur.fetchone()[0])
            if total_dep < 150:
                return err(
                    f"Для вывода нужно пополнить на 150₽ за 7 дней. "
                    f"Пополнено: {total_dep:.0f}₽"
                )
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance - %s WHERE id = %s",
                        (amount, user["id"]))
            cur.execute(
                f"INSERT INTO {SCHEMA}.withdrawals (user_id, amount, bank, sbp_number, status) "
                f"VALUES (%s, %s, %s, %s, 'pending') RETURNING id",
                (user["id"], amount, bank, sbp_number)
            )
            wid = cur.fetchone()[0]
            db.commit()
            return ok({"withdrawal_id": wid, "amount": amount, "status": "pending"})

        # ── GET WITHDRAWALS ───────────────────────
        if action == "get_withdrawals":
            if not token:
                return err("Не авторизован", 401)
            user = get_user(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            cur.execute(
                f"SELECT id, amount, bank, sbp_number, status, created_at "
                f"FROM {SCHEMA}.withdrawals WHERE user_id = %s "
                f"ORDER BY created_at DESC LIMIT 20",
                (user["id"],)
            )
            rows = cur.fetchall()
            return ok({"withdrawals": [
                {"id": r[0], "amount": float(r[1]), "bank": r[2],
                 "sbp_number": r[3], "status": r[4], "created_at": str(r[5])}
                for r in rows
            ]})

        # ══ ADMIN ═════════════════════════════════

        if action == "admin_login":
            pwd = body.get("password", "")
            if pwd != ADMIN_PASSWORD:
                return err("Неверный пароль", 403)
            return ok({"access": True})

        if action == "admin_deposits":
            if body.get("password", "") != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            cur.execute(
                f"SELECT d.id, u.login, d.amount, d.status, d.created_at "
                f"FROM {SCHEMA}.deposits d JOIN {SCHEMA}.users u ON u.id = d.user_id "
                f"ORDER BY d.created_at DESC LIMIT 100"
            )
            rows = cur.fetchall()
            return ok({"deposits": [
                {"id": r[0], "login": r[1], "amount": float(r[2]),
                 "status": r[3], "created_at": str(r[4])}
                for r in rows
            ]})

        if action == "admin_withdrawals":
            if body.get("password", "") != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            cur.execute(
                f"SELECT w.id, u.login, w.amount, w.bank, w.sbp_number, w.status, w.created_at "
                f"FROM {SCHEMA}.withdrawals w JOIN {SCHEMA}.users u ON u.id = w.user_id "
                f"ORDER BY w.created_at DESC LIMIT 100"
            )
            rows = cur.fetchall()
            return ok({"withdrawals": [
                {"id": r[0], "login": r[1], "amount": float(r[2]),
                 "bank": r[3], "sbp_number": r[4], "status": r[5], "created_at": str(r[6])}
                for r in rows
            ]})

        if action == "admin_approve_deposit":
            if body.get("password", "") != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            dep_id = body.get("deposit_id")
            cur.execute(f"SELECT user_id, amount, status FROM {SCHEMA}.deposits WHERE id = %s",
                        (dep_id,))
            row = cur.fetchone()
            if not row:
                return err("Заявка не найдена")
            if row[2] == "approved":
                return err("Уже одобрено")
            cur.execute(
                f"UPDATE {SCHEMA}.deposits SET status = 'approved', approved_at = NOW() WHERE id = %s",
                (dep_id,)
            )
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance + %s WHERE id = %s",
                        (row[1], row[0]))
            db.commit()
            return ok({"success": True})

        if action == "admin_reject_deposit":
            if body.get("password", "") != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            dep_id = body.get("deposit_id")
            cur.execute(f"UPDATE {SCHEMA}.deposits SET status = 'rejected' WHERE id = %s", (dep_id,))
            db.commit()
            return ok({"success": True})

        if action == "admin_approve_withdrawal":
            if body.get("password", "") != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            wid = body.get("withdrawal_id")
            cur.execute(f"SELECT status FROM {SCHEMA}.withdrawals WHERE id = %s", (wid,))
            row = cur.fetchone()
            if not row:
                return err("Заявка не найдена")
            if row[0] == "approved":
                return err("Уже одобрено")
            cur.execute(
                f"UPDATE {SCHEMA}.withdrawals SET status = 'approved', approved_at = NOW() WHERE id = %s",
                (wid,)
            )
            db.commit()
            return ok({"success": True})

        if action == "admin_reject_withdrawal":
            if body.get("password", "") != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            wid = body.get("withdrawal_id")
            cur.execute(f"SELECT user_id, amount FROM {SCHEMA}.withdrawals WHERE id = %s", (wid,))
            row = cur.fetchone()
            if not row:
                return err("Заявка не найдена")
            cur.execute(f"UPDATE {SCHEMA}.withdrawals SET status = 'rejected' WHERE id = %s", (wid,))
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance + %s WHERE id = %s",
                        (row[1], row[0]))
            db.commit()
            return ok({"success": True})

        return err(f"Неизвестное действие: {action}")

    finally:
        cur.close()
        db.close()
