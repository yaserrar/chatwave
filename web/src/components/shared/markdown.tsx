import * as React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CITATION_HREF } from '~/lib/chat';
import { cn } from '~/lib/utils';

/**
 * Claude answers in Markdown (headings, bold, lists, tables). Rendered with the app's type scale instead of
 * browser defaults; raw HTML in the answer is not rendered (react-markdown escapes it by default).
 */
function ExternalLink({ children, href }: { children?: React.ReactNode; href?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-brand-ink underline underline-offset-2">
      {children}
    </a>
  );
}

const components: Components = {
  h1: ({ children }) => <h3 className="mt-4 mb-2 font-display text-base font-medium tracking-tight first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-4 mb-2 font-display text-base font-medium tracking-tight first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 mb-1.5 text-h3 first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-muted-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ExternalLink,
  code: ({ children }) => <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[12px]">{children}</code>,
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg bg-muted p-3 text-[12px]">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-border-strong pl-3 text-ink-2">{children}</blockquote>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b bg-subtle px-3 py-1.5 font-medium">{children}</th>,
  td: ({ children }) => <td className="border-b px-3 py-1.5 last:border-b-0">{children}</td>,
  hr: () => <hr className="my-3 border-hairline" />,
};

/**
 * `renderCitation`: how to show the citation links made by `linkCitations` (`[2](#cite-2)`), e.g. as buttons
 * opening the source. Without it they stay plain links.
 */
export function Markdown({
  children,
  className,
  renderCitation,
}: {
  children: string;
  className?: string;
  renderCitation?: (n: number) => React.ReactNode;
}) {
  const withCitations = React.useMemo<Components>(() => {
    if (!renderCitation) return components;
    return {
      ...components,
      a: ({ children, href }) =>
        href?.startsWith(CITATION_HREF) ? (
          renderCitation(Number(href.slice(CITATION_HREF.length)))
        ) : (
          <ExternalLink href={href}>{children}</ExternalLink>
        ),
    };
  }, [renderCitation]);

  return (
    <div className={cn('text-sm leading-relaxed text-foreground', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={withCitations}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
