
CREATE TABLE t_p5159120_magicesh_casino_proj.users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    balance NUMERIC(12,2) DEFAULT 50.00,
    session_token VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p5159120_magicesh_casino_proj.deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p5159120_magicesh_casino_proj.users(id),
    amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP
);

CREATE TABLE t_p5159120_magicesh_casino_proj.withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p5159120_magicesh_casino_proj.users(id),
    amount NUMERIC(12,2) NOT NULL,
    bank VARCHAR(50) NOT NULL,
    sbp_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP
);
