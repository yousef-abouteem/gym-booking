export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

   if (!res.ok) {
    let message = data.error ?? `Request failed: ${res.status}`;
    // أخطاء zod: نعرض أول حقل فيه مشكلة وسببها
    const issue = data.details?.[0];
    if (issue) message = `${issue.path?.join(".") ?? "input"}: ${issue.message}`;
    throw new ApiError(res.status, message);
  }
  
  return data as T;
}