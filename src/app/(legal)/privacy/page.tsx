import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — JobHawk",
  description: "What JobHawk collects, why, and how to contact the developer.",
};

const ISSUES = "https://github.com/Aditya-S06/JobHawk/issues";

export default function PrivacyPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground">
          This is a personal portfolio project, not a law-firm document. It is
          not professional legal advice. Last updated August 30, 2026.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Who this is</h2>
        <p>
          JobHawk is a personal project by an independent developer. Source is
          on GitHub at{" "}
          <a
            href="https://github.com/Aditya-S06/JobHawk"
            className="text-primary hover:underline"
          >
            Aditya-S06/JobHawk
          </a>
          . It is a portfolio app for internship and new-grad job search, not a
          company product.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">What is collected</h2>
        <p>If you create an account, JobHawk stores:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account email</li>
          <li>Profile name</li>
          <li>Resume text you upload or paste</li>
          <li>Saved and tracked jobs</li>
          <li>API keys you choose to save (encrypted at rest)</li>
          <li>Server logs produced while you use the app</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Why it is collected</h2>
        <p>
          To run the app: sign you in, search jobs, keep your resume and
          application pipeline, call third-party APIs you or the owner
          configured, and debug failures.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Selling data</h2>
        <p>Your data is not sold.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Third parties actually used</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Vercel — hosting</li>
          <li>Supabase — authentication and database</li>
          <li>SerpApi — job search results</li>
          <li>Google Gemini — resume parsing and tailoring</li>
          <li>Notion — optional, only if you connect it</li>
        </ul>
        <p>
          Those providers process what they need to provide their service. This
          project has not completed SOC 2 or similar audits. Do not treat it as
          an enterprise compliance product.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Deletion and contact</h2>
        <p>
          There is no in-app account-deletion API. To ask that your account and
          stored data be deleted, open a GitHub issue on{" "}
          <a href={ISSUES} className="text-primary hover:underline">
            Aditya-S06/JobHawk
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Changes and shutdown</h2>
        <p>
          Features, hosting, and data retention may change. The service may shut
          down. See also the{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Use
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
