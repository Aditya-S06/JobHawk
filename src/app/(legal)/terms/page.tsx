import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — JobHawk",
  description: "Terms for using JobHawk, a personal portfolio project.",
};

const ISSUES = "https://github.com/Aditya-S06/JobHawk/issues";

export default function TermsPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Terms of Use</h1>
        <p className="text-xs text-muted-foreground">
          This is a personal portfolio project, not a law-firm document. It is
          not professional legal advice. Last updated August 30, 2026.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">As-is</h2>
        <p>
          JobHawk is a personal project provided as-is, with no warranties. It
          may be incomplete, change, or go offline. Job search results and AI
          output can be wrong.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Acceptable use</h2>
        <p>
          Do not abuse the service, run scraping or other attacks against it, or
          use it for illegal content or activity.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Accounts</h2>
        <p>
          Accounts may be removed at any time, including for abuse or if the
          project shuts down. There is no in-app account-deletion API; deletion
          requests go through{" "}
          <a href={ISSUES} className="text-primary hover:underline">
            GitHub issues
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Liability</h2>
        <p>
          I am not liable for job outcomes, third-party API results, lost data,
          or downtime. Use the app at your own risk.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Contact</h2>
        <p>
          Questions:{" "}
          <a href={ISSUES} className="text-primary hover:underline">
            github.com/Aditya-S06/JobHawk/issues
          </a>
          . See also the{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
