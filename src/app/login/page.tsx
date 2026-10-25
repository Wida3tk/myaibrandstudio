"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldGroup, Input, Label } from "@/components/ui/input";
import { LanguageToggle } from "@/components/language-toggle";
import { useLocale } from "@/components/locale-provider";

const COPY = {
  en: {
    signIn: "Sign in",
    signUp: "Create your account",
    email: "Email",
    password: "Password",
    submitSignIn: "Sign in",
    submitSignUp: "Sign up",
    google: "Continue with Google",
    toSignUp: "Need an account? Sign up",
    toSignIn: "Already have an account? Sign in",
    tagline: "Your AI-powered social content studio.",
  },
  ar: {
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حسابك",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    submitSignIn: "تسجيل الدخول",
    submitSignUp: "تسجيل",
    google: "الاستمرار بحساب Google",
    toSignUp: "ليس لديك حساب؟ سجل الآن",
    toSignIn: "لديك حساب؟ سجّل الدخول",
    tagline: "استوديو محتواك الاجتماعي المدعوم بالذكاء الاصطناعي.",
  },
};

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, user } =
    useAuth();
  const router = useRouter();
  const { locale } = useLocale();
  const copy = COPY[locale];
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
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-bg via-bg to-accent-soft px-4 py-10"
    >
      <div className="absolute top-4 end-4">
        <LanguageToggle />
      </div>

      <div className="flex items-center gap-2 text-navy dark:text-text">
        <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-accent text-accent-contrast">
          <Sparkles size={20} />
        </span>
        <div className="text-start">
          <p className="font-semibold leading-tight">My AI Brand Studio</p>
          <p className="text-xs text-text-muted">{copy.tagline}</p>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent>
          <h1 className="text-lg font-semibold text-text">
            {mode === "signup" ? copy.signUp : copy.signIn}
          </h1>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <FieldGroup>
              <Label htmlFor="email">{copy.email}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="password">{copy.password}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FieldGroup>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting
                ? "…"
                : mode === "signup"
                  ? copy.submitSignUp
                  : copy.submitSignIn}
            </Button>
          </form>

          <Button
            type="button"
            variant="secondary"
            onClick={handleGoogle}
            className="mt-3 w-full"
          >
            {copy.google}
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="mt-4 text-sm text-text-muted underline underline-offset-2 hover:text-text"
          >
            {mode === "signup" ? copy.toSignIn : copy.toSignUp}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
