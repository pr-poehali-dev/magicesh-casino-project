"""Админ панель MAGISCESH. action в body: stats/deposits/withdrawals/approve_deposit/reject_deposit/approve_withdrawal/reject_withdrawal"""
import json
import os
import psycopg2

SCHEMA = "t_p5159120_magicesh_casino_proj"
ADMIN_PASSWORD = "2007qwerQ"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def r(code, data):
    return {"statusCode": code, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = event.get("headers", {})
    if headers.get("X-Admin-Password", "") != ADMIN_PASSWORD:
        return r(403, {"error": "Неверный пароль"})

    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "stats")

    conn = get_conn()
    cur = conn.cursor()

    if action == "stats":
        cur.execute(f"SELECT COUNT(*), COALESCE(SUM(balance),0) FROM {SCHEMA}.users")
        u = cur.fetchone()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.deposits WHERE status='pending'")
        dp = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.withdrawals WHERE status='pending'")
        wp = cur.fetchone()[0]
        cur.close(); conn.close()
        return r(200, {"users": u[0], "total_balance": float(u[1]), "pending_deposits": dp, "pending_withdrawals": wp})

    if action == "deposits":
        cur.execute(
            f"SELECT d.id, u.login, d.amount, d.status, d.created_at FROM {SCHEMA}.deposits d "
            f"JOIN {SCHEMA}.users u ON u.id=d.user_id ORDER BY d.created_at DESC LIMIT 50"
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return r(200, [{"id": row[0], "login": row[1], "amount": float(row[2]), "status": row[3], "date": str(row[4])} for row in rows])

    if action == "withdrawals":
        cur.execute(
            f"SELECT w.id, u.login, w.amount, w.bank, w.sbp_number, w.status, w.created_at FROM {SCHEMA}.withdrawals w "
            f"JOIN {SCHEMA}.users u ON u.id=w.user_id ORDER BY w.created_at DESC LIMIT 50"
        )
        rows = cur.fetchall()
        cur.close(); conn.close()
        return r(200, [{"id": row[0], "login": row[1], "amount": float(row[2]), "bank": row[3], "sbp": row[4], "status": row[5], "date": str(row[6])} for row in rows])

    if action == "approve_deposit":
        dep_id = body.get("id")
        cur.execute(f"SELECT user_id, amount, status FROM {SCHEMA}.deposits WHERE id=%s", (dep_id,))
        dep = cur.fetchone()
        if not dep:
            cur.close(); conn.close()
            return r(404, {"error": "Заявка не найдена"})
        if dep[2] != "pending":
            cur.close(); conn.close()
            return r(400, {"error": "Заявка уже обработана"})
        cur.execute(f"UPDATE {SCHEMA}.deposits SET status='approved', approved_at=NOW() WHERE id=%s", (dep_id,))
        cur.execute(f"UPDATE {SCHEMA}.users SET balance=balance+%s WHERE id=%s", (dep[1], dep[0]))
        conn.commit()
        cur.close(); conn.close()
        return r(200, {"ok": True})

    if action == "reject_deposit":
        dep_id = body.get("id")
        cur.execute(f"UPDATE {SCHEMA}.deposits SET status='rejected' WHERE id=%s AND status='pending'", (dep_id,))
        conn.commit()
        cur.close(); conn.close()
        return r(200, {"ok": True})

    if action == "approve_withdrawal":
        wid = body.get("id")
        cur.execute(f"UPDATE {SCHEMA}.withdrawals SET status='approved', approved_at=NOW() WHERE id=%s AND status='pending'", (wid,))
        conn.commit()
        cur.close(); conn.close()
        return r(200, {"ok": True})

    if action == "reject_withdrawal":
        wid = body.get("id")
        cur.execute(f"SELECT user_id, amount, status FROM {SCHEMA}.withdrawals WHERE id=%s", (wid,))
        w = cur.fetchone()
        if not w:
            cur.close(); conn.close()
            return r(404, {"error": "Заявка не найдена"})
        if w[2] != "pending":
            cur.close(); conn.close()
            return r(400, {"error": "Заявка уже обработана"})
        cur.execute(f"UPDATE {SCHEMA}.withdrawals SET status='rejected' WHERE id=%s", (wid,))
        cur.execute(f"UPDATE {SCHEMA}.users SET balance=balance+%s WHERE id=%s", (w[1], w[0]))
        conn.commit()
        cur.close(); conn.close()
        return r(200, {"ok": True})

    cur.close(); conn.close()
    return r(400, {"error": "Unknown action"})