"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/Toast";

const baseSchema = z.object({
  name: z.string(),
  email: z
    .string()
    .min(1, "Email is required")
    .regex(/.+@.+\..+/, "Enter a valid email"),
  password: z.string().min(1, "Password is required").min(10, "Use at least 10 characters"),
});
const registerSchema = baseSchema.extend({
  name: z.string().min(1, "Name is required").max(120, "Keep it under 120 characters"),
});
type Creds = z.infer<typeof baseSchema>;

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const router = useRouter();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<Creds>({
    resolver: zodResolver(mode === "register" ? registerSchema : baseSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const submit = handleSubmit(async ({ name, email, password }) => {
    try {
      if (mode === "register") await api.register({ email, password, name });
      else await api.login({ email, password });
      router.push("/dashboard");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Invalid credentials", "error");
    }
  });

  const switchMode = () => {
    clearErrors();
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <div className="card w-full max-w-md p-8 animate-rise">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-bg">
            <Sparkles className="h-4 w-4" />
          </span>
          Momentum
        </Link>

        <h1 className="mt-6 font-display text-2xl font-bold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted">Signing in only identifies you. Nothing connects until you say so.</p>

        {/* Path A: custom email/password + Google (drives the backend data) */}
        <a href={api.googleLoginUrl()} className="btn-ghost mt-6 w-full">
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
            <path
              fill="#FFC107"
              d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4 5.6l6.3 5.2C36.9 40.4 44 35 44 24c0-1.3-.1-2.7-.4-3.9z"
            />
          </svg>
          Continue with Google
        </a>

        <div className="my-5 flex items-center gap-3 text-xs text-faint">
          <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === "register" && (
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Name
              </label>
              <input id="name" className="input" placeholder="Your name" autoComplete="name" {...register("name")} />
              {errors.name && <p className="mt-1 text-xs text-urgent">{errors.name.message}</p>}
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="you@work.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && <p className="mt-1 text-xs text-urgent">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              placeholder="10+ characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              {...register("password")}
            />
            {errors.password && <p className="mt-1 text-xs text-urgent">{errors.password.message}</p>}
          </div>
          <button className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button className="mt-4 w-full text-center text-sm text-muted hover:text-accent" onClick={switchMode}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>

        {/* Path B: Clerk (Google + email/password, managed) */}
        <div className="mt-6 rounded-xl border border-line bg-surface-2/50 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Prefer managed auth?
          </p>
          <p className="mt-1 text-xs text-muted">Use Clerk for hosted sign-in with MFA and social logins.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/sign-in" className="btn-ghost flex-1 !py-2 text-xs">
              Sign in with Clerk
            </Link>
            <Link href="/sign-up" className="btn-ghost flex-1 !py-2 text-xs">
              Create with Clerk
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
