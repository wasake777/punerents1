import { login } from "../actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  bad: "Wrong password.",
  rate: "Too many attempts - try again in 15 minutes.",
  unconfigured: "ADMIN_PASSWORD is not set on the server.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const msg = error ? ERRORS[error] ?? "Sign-in failed." : null;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-900">
      <form action={login} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-lg font-bold">PuneRents admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter the admin password to continue.
        </p>
        {msg && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {msg}
          </p>
        )}
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="Password"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <button className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
          Sign in
        </button>
      </form>
    </main>
  );
}
