const AUTH_URL = "https://functions.poehali.dev/ae17fb7d-a42f-4137-8474-5b8a65f22870";
const PAYMENTS_URL = "https://functions.poehali.dev/3551ab92-1728-426d-9533-624ca167d82e";
const ADMIN_URL = "https://functions.poehali.dev/6181e4b3-34ea-4ebf-92af-c1c55906f1ec";

function getToken() {
  return localStorage.getItem("casino_token") || "";
}

async function authCall(body: object) {
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Token": getToken() },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function paymentsCall(body: object) {
  const res = await fetch(PAYMENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Token": getToken() },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function adminCall(body: object, adminPassword: string) {
  const res = await fetch(ADMIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Password": adminPassword },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const api = {
  register: () => authCall({ action: "register" }),
  login: (login: string, password: string) => authCall({ action: "login", login, password }),
  me: () => authCall({ action: "me" }),
  update: (data: { login?: string; password?: string }) => authCall({ action: "update", ...data }),

  deposit: (amount: number) => paymentsCall({ action: "deposit", amount }),
  withdraw: (amount: number, bank: string, sbp: string) => paymentsCall({ action: "withdraw", amount, bank, sbp }),
  history: () => paymentsCall({ action: "history" }),
  canWithdraw: () => paymentsCall({ action: "can_withdraw" }),

  adminStats: (pwd: string) => adminCall({ action: "stats" }, pwd),
  adminDeposits: (pwd: string) => adminCall({ action: "deposits" }, pwd),
  adminWithdrawals: (pwd: string) => adminCall({ action: "withdrawals" }, pwd),
  adminApproveDeposit: (id: number, pwd: string) => adminCall({ action: "approve_deposit", id }, pwd),
  adminRejectDeposit: (id: number, pwd: string) => adminCall({ action: "reject_deposit", id }, pwd),
  adminApproveWithdrawal: (id: number, pwd: string) => adminCall({ action: "approve_withdrawal", id }, pwd),
  adminRejectWithdrawal: (id: number, pwd: string) => adminCall({ action: "reject_withdrawal", id }, pwd),
};
