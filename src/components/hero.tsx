"use client";

import { useLocale } from "./locale-provider";

const COPY = {
  en: {
    heading: "Planning is done. Foundations are next.",
    body: "This shell proves the token layer and the RTL/LTR switch work before any feature is built on top of them.",
  },
  ar: {
    heading: "اكتمل التخطيط. الأساسات هي التالية.",
    body: "تثبت هذه الواجهة أن طبقة الرموز والتبديل بين اليمين والشمال يعملان قبل بناء أي ميزة عليهما.",
  },
};

export function Hero() {
  const { locale } = useLocale();
  const copy = COPY[locale];

  return (
    <section
      className="rounded-md border border-border bg-surface ps-6 pe-6 py-6 text-start"
      lang={locale}
    >
      <h1 className="text-2xl font-semibold text-text">{copy.heading}</h1>
      <p className="mt-2 text-text-muted">{copy.body}</p>
    </section>
  );
}
