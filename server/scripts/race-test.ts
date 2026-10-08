// يختبر منع تجاوز السعة: حصة بمقعد واحد و10 أعضاء يحجزون في نفس اللحظة
const API = "http://localhost:4000/api";

async function post(path: string, body?: unknown, token?: string) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

async function login(email: string): Promise<string> {
  const r = await post("/auth/login", { email, password: "password123" });
  return r.data.token;
}

async function main() {
  // ١. صاحب النادي ينشئ حصة بعد يومين، سعتها مقعد واحد
  const ownerToken = await login("owner@test.com");
  const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const created = await post(
    "/gyms/power-fit/sessions",
    {
      class_type_id: "1",
      trainer_name: "Race Test",
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      capacity: 1,
    },
    ownerToken
  );
  const sessionId: string = created.data.session.id;
  console.log(`Created session ${sessionId} with capacity 1`);

  // ٢. نسجّل 10 أعضاء جدد
  const runId = Date.now();
  const tokens = await Promise.all(
    Array.from({ length: 10 }, async (_, i) => {
      const email = `racer${i}-${runId}@test.com`;
      await post("/auth/register", { name: `Racer ${i}`, email, password: "password123" });
      return login(email);
    })
  );
  console.log(`Registered ${tokens.length} members`);

  // ٣. الكل يحجز في نفس اللحظة
  const results = await Promise.all(
    tokens.map((t) => post(`/sessions/${sessionId}/bookings`, undefined, t))
  );

  const counts: Record<number, number> = {};
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;
  console.log("Results by status:", counts);

  // ٤. نتأكد من قاعدة البيانات نفسها
  const list = await fetch(`${API}/gyms/power-fit/sessions`).then((r) => r.json());
  const session = list.sessions.find((s: any) => s.id === sessionId);
  console.log("spots_left:", session.spots_left);
}

main();