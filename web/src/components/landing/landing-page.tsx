import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "~/components/layout/theme-toggle";
import { Wordmark } from "~/components/layout/wordmark";
import { SITE } from "~/constants/site";
import { EntryButton } from "./entry-button";
import { Faq } from "./faq";
import { Features } from "./features";
import { Hero } from "./hero";
import { RagExplainer } from "./rag-explainer";
import { TechStack } from "./tech-stack";

/** The public home page: what Chatwave is (a RAG app), how it works, and a one-click way in. */
export function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <Header />
      <main id="main">
        <Hero />
        <RagExplainer />
        {/* <RagCompare /> */}
        <Features />
        <TechStack />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

const FOOTER_LINKS = [
  { href: "#how-rag-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
] as const;

function Footer() {
  return (
    <footer className="relative overflow-hidden border-t bg-subtle/50">
      <div
        aria-hidden
        className="bg-dot-grid mask-fade-b pointer-events-none absolute inset-0"
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-sm flex-col gap-3">
            <Wordmark />
            <p className="text-sm leading-6 text-ink-2 text-pretty">
              {SITE.description}
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-3 text-sm">
            <span className="text-eyebrow text-brand-ink">Explore</span>
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-ink-2 transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-hairline py-6 text-sm text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {SITE.name}. {SITE.tagline}.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link
          to="/"
          aria-label="Chatwave home"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
        <nav
          aria-label="Page"
          className="hidden items-center gap-6 text-sm text-ink-2 md:flex"
        >
          <a
            href="#how-rag-works"
            className="transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a href="#faq" className="transition-colors hover:text-foreground">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:inline-flex" />
          <EntryButton size="sm" variant="outline" />
        </div>
      </div>
    </header>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="bg-dot-grid mask-fade-edges pointer-events-none absolute inset-0"
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 py-20 text-center sm:px-8 md:py-28">
        <h2 className="text-h1 text-balance sm:text-4xl sm:leading-[1.12]">
          Try it on your own documents
        </h2>
        <p className="max-w-xl text-base leading-7 text-ink-2 text-pretty">
          Create a project, upload a file and ask your first question in under a
          minute. No sign-up, no email.
        </p>
        <EntryButton />
      </div>
    </section>
  );
}
