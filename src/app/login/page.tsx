"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/auth-provider";

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, user } =
    useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace("/brand");
    }
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      router.push("/brand");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
      router.push("/brand");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold text-text">
        {mode === "signup" ? "Create your account" : "Sign in"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-contrast disabled:opacity-60"
        >
          {mode === "signup" ? "Sign up" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleGoogle}
        className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-surface"
      >
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        className="mt-4 text-sm text-text-muted underline"
      >
        {mode === "signup"
          ? "Already have an account? Sign in"
          : "Need an account? Sign up"}
      </button>
    </div>
  );
}
