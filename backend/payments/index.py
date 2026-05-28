"""Пополнение и вывод средств MAGISCESH. action в body: deposit/withdraw/history/can_withdraw"""
import json
import os
import psycopg2

SCHEMA = "t_p5159120_magicesh_casino_proj"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user(cur, token):
    cur.execute(f"SELECT id, balance FROM {SCHEMA}.users WHERE session_token=%s", (token,))
    return cur.fetchone()

def r(code, data):
    return {"statusCode": code, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    token = event.get("headers", {}).get("X-Session-Token", "")
    action = body.get("action", "")

    conn = get_conn()
    cur = conn.cursor()

    if action == "deposit":
        user = get_user(cur, token)
        if not user:
            cur.close(); conn.close()
            return r(401, {"error": "Не авторизован"})
        amount = float(body.get("amount", 0))
        if amount < 100:
            cur.close(); conn.close()
            return r(400, {"error": "Минимальная сумма пополнения 100₽"})
        cur.execute(
            f"INSERT INTO {SCHEMA}.deposits (user_id, amount, status) VALUES (%s, %s, 'pending') RETURNING id",
            (user[0], amount)
        )
        dep_id = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()
        return r(200, {"id": dep_id, "amount": amount, "status": "pending"})

    if action == "withdraw":
        user = get_user(cur, token)
        if not user:
            cur.close(); conn.close()
            return r(401, {"error": "Не авторизован"})
        uid, balance = user
        amount = float(body.get("amount", 0))
        bank = body.get("bank", "")
        sbp = body.get("sbp", "")
        if amount <= 0:
            cur.close(); conn.close()
            return r(400, {"error": "Неверная сумма"})
        if balance < amount:
            cur.close(); conn.close()
            return r(400, {"error": "Недостаточно средств"})
        if not bank or not sbp:
            cur.close(); conn.close()
            return r(400, {"error": "Укажите банк и номер СБП"})
        cur.execute(
            f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.deposits WHERE user_id=%s AND status='approved' AND approved_at > NOW() - INTERVAL '7 days'",
            (uid,)
        )
        dep_7d = float(cur.fetchone()[0])
        if dep_7d < 150:
            cur.close(); conn.close()
            return r(403, {"error": "Для вывода нужно пополнить баланс на 150₽ за последние 7 дней"})
        cur.execute(f"UPDATE {SCHEMA}.users SET balance=balance-%s WHERE id=%s", (amount, uid))
        cur.execute(
            f"INSERT INTO {SCHEMA}.withdrawals (user_id, amount, bank, sbp_number, status) VALUES (%s,%s,%s,%s,'pending') RETURNING id",
            (uid, amount, bank, sbp)
        )
        wid = cur.fetchone()[0]
        conn.commit()
        cur.close(); conn.close()
        return r(200, {"id": wid, "amount": amount, "status": "pending"})

    if action == "history":
        user = get_user(cur, token)
        if not user:
            cur.close(); conn.close()
            return r(401, {"error": "Не авторизован"})
        uid = user[0]
        cur.execute(
            f"SELECT 'deposit' as type, amount, status, created_at FROM {SCHEMA}.deposits WHERE user_id=%s "
            f"UNION ALL SELECT 'withdrawal', amount, status, created_at FROM {SCHEMA}.withdrawals WHERE user_id=%s "
            f"ORDER BY created_at DESC LIMIT 30",
            (uid, uid)
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return r(200, [{"type": row[0], "amount": float(row[1]), "status": row[2], "date": str(row[3])} for row in rows])

    if action == "can_withdraw":
        user = get_user(cur, token)
        if not user:
            cur.close(); conn.close()
            return r(401, {"error": "Не авторизован"})
        cur.execute(
            f"SELECT COALESCE(SUM(amount),0) FROM {SCHEMA}.deposits WHERE user_id=%s AND status='approved' AND approved_at > NOW() - INTERVAL '7 days'",
            (user[0],)
        )
        dep_7d = float(cur.fetchone()[0])
        cur.close(); conn.close()
        return r(200, {"can_withdraw": dep_7d >= 150, "deposited_7d": dep_7d, "required": 150})

    # Нет токена — 401, нет action — 400
    if not token:
        cur.close(); conn.close()
        return r(401, {"error": "Не авторизован"})
    cur.close(); conn.close()
    return r(400, {"error": "Unknown action"})