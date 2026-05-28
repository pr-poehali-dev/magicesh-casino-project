"""
Главный API казино MAGISCESH: регистрация, авторизация, баланс, пополнение, вывод, админ
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

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id, Authorization, X-Authorization",
    "Content-Type": "application/json"
}

def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(data, ensure_ascii=False, default=str)}

def err(msg, code=400):
    return {"statusCode": code, "headers": CORS_HEADERS, "body": json.dumps({"error": msg}, ensure_ascii=False)}

def hash_password(pwd):
    return hashlib.sha256(pwd.encode()).hexdigest()

def gen_token():
    return secrets.token_hex(32)

def gen_login():
    return "user" + "".join(random.choices(string.digits, k=6))

def gen_password():
    chars = string.ascii_letters + string.digits
    return "".join(random.choices(chars, k=10))

def get_user_by_token(cur, token):
    cur.execute(f"SELECT id, login, balance, display_name FROM {SCHEMA}.users WHERE session_token = %s", (token,))
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "login": row[1], "balance": float(row[2] or 0), "display_name": row[3]}

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    raw_path = event.get("path", "/")
    # Normalize path: strip function prefix like /d4e855kaipb0bsevk028/register -> /register
    parts = raw_path.split("/")
    # If path has 3+ segments starting with /, strip the function id segment
    if len(parts) >= 3 and parts[0] == "" and len(parts[1]) > 8:
        path = "/" + "/".join(parts[2:])
    else:
        path = raw_path
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except:
            pass

    auth_header = event.get("headers", {}).get("X-Authorization", "") or event.get("headers", {}).get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header else ""

    db = get_db()
    cur = db.cursor()

    try:
        # GET / — health check
        if path in ("/", "") and method == "GET":
            return ok({"status": "ok", "service": "MAGISCESH Casino API"})

        # POST /register — регистрация нового пользователя
        if path == "/register" and method == "POST":
            login = gen_login()
            password = gen_password()
            pw_hash = hash_password(password)
            tok = gen_token()
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (login, password, balance, session_token) VALUES (%s, %s, 50.00, %s) RETURNING id",
                (login, pw_hash, tok)
            )
            uid = cur.fetchone()[0]
            db.commit()
            return ok({"login": login, "password": password, "token": tok, "user_id": uid, "balance": 50.0})

        # POST /login — вход
        if path == "/login" and method == "POST":
            login = body.get("login", "").strip()
            password = body.get("password", "").strip()
            if not login or not password:
                return err("Введите логин и пароль")
            pw_hash = hash_password(password)
            cur.execute(f"SELECT id, balance, display_name FROM {SCHEMA}.users WHERE login = %s AND password = %s", (login, pw_hash))
            row = cur.fetchone()
            if not row:
                return err("Неверный логин или пароль")
            uid, bal, dname = row
            tok = gen_token()
            cur.execute(f"UPDATE {SCHEMA}.users SET session_token = %s WHERE id = %s", (tok, uid))
            db.commit()
            return ok({"token": tok, "user_id": uid, "login": login, "balance": float(bal or 0), "display_name": dname})

        # GET /me — получить данные текущего пользователя
        if path == "/me" and method == "GET":
            if not token:
                return err("Не авторизован", 401)
            user = get_user_by_token(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            return ok(user)

        # POST /update-profile — изменить логин/пароль/имя
        if path == "/update-profile" and method == "POST":
            if not token:
                return err("Не авторизован", 401)
            user = get_user_by_token(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            new_login = body.get("login", "").strip()
            new_password = body.get("password", "").strip()
            new_name = body.get("display_name", "").strip()
            if new_login:
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE login = %s AND id != %s", (new_login, user["id"]))
                if cur.fetchone():
                    return err("Этот логин уже занят")
                cur.execute(f"UPDATE {SCHEMA}.users SET login = %s WHERE id = %s", (new_login, user["id"]))
            if new_password:
                pw_hash = hash_password(new_password)
                cur.execute(f"UPDATE {SCHEMA}.users SET password = %s WHERE id = %s", (pw_hash, user["id"]))
            if new_name:
                cur.execute(f"UPDATE {SCHEMA}.users SET display_name = %s WHERE id = %s", (new_name, user["id"]))
            db.commit()
            return ok({"success": True})

        # POST /deposit — создать заявку на пополнение
        if path == "/deposit" and method == "POST":
            if not token:
                return err("Не авторизован", 401)
            user = get_user_by_token(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            amount = float(body.get("amount", 0))
            phone = body.get("phone", "").strip()
            if amount < 100:
                return err("Минимальная сумма пополнения 100₽")
            cur.execute(
                f"INSERT INTO {SCHEMA}.deposits (user_id, amount, status, phone) VALUES (%s, %s, 'pending', %s) RETURNING id",
                (user["id"], amount, phone)
            )
            dep_id = cur.fetchone()[0]
            db.commit()
            return ok({"deposit_id": dep_id, "amount": amount, "beeline_phone": BEELINE_PHONE, "status": "pending"})

        # GET /deposits — история пополнений пользователя
        if path == "/deposits" and method == "GET":
            if not token:
                return err("Не авторизован", 401)
            user = get_user_by_token(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            cur.execute(
                f"SELECT id, amount, status, created_at, approved_at FROM {SCHEMA}.deposits WHERE user_id = %s ORDER BY created_at DESC LIMIT 20",
                (user["id"],)
            )
            rows = cur.fetchall()
            deps = [{"id": r[0], "amount": float(r[1]), "status": r[2], "created_at": str(r[3]), "approved_at": str(r[4]) if r[4] else None} for r in rows]
            return ok({"deposits": deps})

        # POST /withdraw — создать заявку на вывод
        if path == "/withdraw" and method == "POST":
            if not token:
                return err("Не авторизован", 401)
            user = get_user_by_token(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            amount = float(body.get("amount", 0))
            bank = body.get("bank", "").strip()
            sbp_number = body.get("sbp_number", "").strip()
            if amount <= 0:
                return err("Укажите сумму вывода")
            if not bank or not sbp_number:
                return err("Выберите банк и введите номер СБП")
            if user["balance"] < amount:
                return err("Недостаточно средств на балансе")
            # Проверяем, что за 7 дней пополнено >= 150₽
            week_ago = datetime.now() - timedelta(days=7)
            cur.execute(
                f"SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.deposits WHERE user_id = %s AND status = 'approved' AND approved_at >= %s",
                (user["id"], week_ago)
            )
            total_deposited = float(cur.fetchone()[0])
            if total_deposited < 150:
                return err(f"Для вывода нужно пополнить баланс на 150₽ за последние 7 дней. Ваше пополнение: {total_deposited}₽")
            # Списываем баланс и создаём заявку
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance - %s WHERE id = %s", (amount, user["id"]))
            cur.execute(
                f"INSERT INTO {SCHEMA}.withdrawals (user_id, amount, bank, sbp_number, status) VALUES (%s, %s, %s, %s, 'pending') RETURNING id",
                (user["id"], amount, bank, sbp_number)
            )
            wid = cur.fetchone()[0]
            db.commit()
            return ok({"withdrawal_id": wid, "amount": amount, "status": "pending"})

        # GET /withdrawals — история выводов пользователя
        if path == "/withdrawals" and method == "GET":
            if not token:
                return err("Не авторизован", 401)
            user = get_user_by_token(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            cur.execute(
                f"SELECT id, amount, bank, sbp_number, status, created_at FROM {SCHEMA}.withdrawals WHERE user_id = %s ORDER BY created_at DESC LIMIT 20",
                (user["id"],)
            )
            rows = cur.fetchall()
            wds = [{"id": r[0], "amount": float(r[1]), "bank": r[2], "sbp_number": r[3], "status": r[4], "created_at": str(r[5])} for r in rows]
            return ok({"withdrawals": wds})

        # POST /update-balance — обновить баланс (внутренний, для игр)
        if path == "/update-balance" and method == "POST":
            if not token:
                return err("Не авторизован", 401)
            user = get_user_by_token(cur, token)
            if not user:
                return err("Сессия устарела", 401)
            new_balance = body.get("balance")
            if new_balance is None:
                return err("Укажите баланс")
            new_balance = float(new_balance)
            if new_balance < 0:
                new_balance = 0
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = %s WHERE id = %s", (new_balance, user["id"]))
            db.commit()
            return ok({"balance": new_balance})

        # ===== ADMIN =====
        # POST /admin/login
        if path == "/admin/login" and method == "POST":
            pwd = body.get("password", "")
            if pwd != ADMIN_PASSWORD:
                return err("Неверный пароль", 403)
            return ok({"access": True})

        # GET /admin/deposits — все заявки на пополнение
        if path == "/admin/deposits" and method == "GET":
            pwd = event.get("queryStringParameters", {}).get("pwd", "")
            if pwd != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            cur.execute(
                f"""SELECT d.id, d.user_id, u.login, d.amount, d.status, d.created_at, d.phone
                    FROM {SCHEMA}.deposits d JOIN {SCHEMA}.users u ON u.id = d.user_id
                    ORDER BY d.created_at DESC LIMIT 100"""
            )
            rows = cur.fetchall()
            deps = [{"id": r[0], "user_id": r[1], "login": r[2], "amount": float(r[3]), "status": r[4], "created_at": str(r[5]), "phone": r[6]} for r in rows]
            return ok({"deposits": deps})

        # POST /admin/approve-deposit — одобрить пополнение
        if path == "/admin/approve-deposit" and method == "POST":
            pwd = body.get("password", "")
            if pwd != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            dep_id = body.get("deposit_id")
            cur.execute(f"SELECT user_id, amount, status FROM {SCHEMA}.deposits WHERE id = %s", (dep_id,))
            row = cur.fetchone()
            if not row:
                return err("Заявка не найдена")
            if row[2] == "approved":
                return err("Уже одобрено")
            cur.execute(
                f"UPDATE {SCHEMA}.deposits SET status = 'approved', approved_at = NOW() WHERE id = %s",
                (dep_id,)
            )
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance + %s WHERE id = %s", (row[1], row[0]))
            db.commit()
            return ok({"success": True})

        # POST /admin/reject-deposit — отклонить пополнение
        if path == "/admin/reject-deposit" and method == "POST":
            pwd = body.get("password", "")
            if pwd != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            dep_id = body.get("deposit_id")
            cur.execute(f"UPDATE {SCHEMA}.deposits SET status = 'rejected' WHERE id = %s", (dep_id,))
            db.commit()
            return ok({"success": True})

        # GET /admin/withdrawals — все заявки на вывод
        if path == "/admin/withdrawals" and method == "GET":
            pwd = event.get("queryStringParameters", {}).get("pwd", "")
            if pwd != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            cur.execute(
                f"""SELECT w.id, w.user_id, u.login, w.amount, w.bank, w.sbp_number, w.status, w.created_at
                    FROM {SCHEMA}.withdrawals w JOIN {SCHEMA}.users u ON u.id = w.user_id
                    ORDER BY w.created_at DESC LIMIT 100"""
            )
            rows = cur.fetchall()
            wds = [{"id": r[0], "user_id": r[1], "login": r[2], "amount": float(r[3]), "bank": r[4], "sbp_number": r[5], "status": r[6], "created_at": str(r[7])} for r in rows]
            return ok({"withdrawals": wds})

        # POST /admin/approve-withdrawal
        if path == "/admin/approve-withdrawal" and method == "POST":
            pwd = body.get("password", "")
            if pwd != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            wid = body.get("withdrawal_id")
            cur.execute(f"SELECT status FROM {SCHEMA}.withdrawals WHERE id = %s", (wid,))
            row = cur.fetchone()
            if not row:
                return err("Заявка не найдена")
            if row[0] == "approved":
                return err("Уже одобрено")
            cur.execute(f"UPDATE {SCHEMA}.withdrawals SET status = 'approved', approved_at = NOW() WHERE id = %s", (wid,))
            db.commit()
            return ok({"success": True})

        # POST /admin/reject-withdrawal
        if path == "/admin/reject-withdrawal" and method == "POST":
            pwd = body.get("password", "")
            if pwd != ADMIN_PASSWORD:
                return err("Доступ запрещён", 403)
            wid = body.get("withdrawal_id")
            cur.execute(f"SELECT user_id, amount FROM {SCHEMA}.withdrawals WHERE id = %s", (wid,))
            row = cur.fetchone()
            if not row:
                return err("Заявка не найдена")
            # Вернуть деньги пользователю
            cur.execute(f"UPDATE {SCHEMA}.withdrawals SET status = 'rejected' WHERE id = %s", (wid,))
            cur.execute(f"UPDATE {SCHEMA}.users SET balance = balance + %s WHERE id = %s", (row[1], row[0]))
            db.commit()
            return ok({"success": True})

        return err("Маршрут не найден", 404)

    finally:
        cur.close()
        db.close()