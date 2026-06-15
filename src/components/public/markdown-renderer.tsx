"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ExternalLink, Copy, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { ImageLightbox } from "./image-lightbox";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function CodeBlock({
  className: codeClassName,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: string }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [copied, setCopied] = useState(false);

  const match = /language-(\w+)/.exec(codeClassName || "");
  const lang = match ? match[1] : undefined;
  const code = String(children).replace(/\n$/, "");
  const lines = code.split("\n");

  if (!lang) {
    return (
      <code
        className={`${codeClassName} bg-muted text-foreground/90 px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border border-border/40`}
        {...props}
      >
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  };

  return (
    <div className="relative group my-6">
      {/* Language label badge */}
      <div className="flex items-center justify-between">
        <span className="absolute top-2.5 left-3 z-10 text-[11px] font-medium uppercase tracking-wider text-white/40 select-none">
          {lang}
        </span>

        {/* Copy button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleCopy}
          className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all duration-200 cursor-pointer backdrop-blur-sm"
          aria-label="Copy code"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="copied"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 text-emerald-400"
              >
                <Check className="size-3" strokeWidth={2.5} />
                Copied!
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                <Copy className="size-3" />
                Copy
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Code block */}
      <div className="rounded-lg overflow-hidden border border-border/30">
        <div className="overflow-x-auto custom-code-scroll">
          <SyntaxHighlighter
            language={lang}
            style={isDark ? oneDark : oneDark}
            PreTag="div"
            showLineNumbers={lines.length > 3}
            lineNumberStyle={{
              minWidth: "2.5em",
              paddingRight: "1em",
              color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
              userSelect: "none",
              fontSize: "0.8em",
            }}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: "0.85em",
              padding: "1em 1.25em",
              background: isDark ? "#1a1a2e" : "#fafafa",
            }}
            codeTagProps={{
              style: {
                fontFamily: "var(--font-geist-mono), monospace",
              },
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  const handleImageClick = useCallback((src: string, alt: string) => {
    setLightboxImage({ src, alt });
  }, []);

  const components: Components = {
    code: CodeBlock,
    h1: ({ node, children, ...props }) => (
      <h1 {...props}>{children}</h1>
    ),
    h2: ({ node, children, ...props }) => (
      <h2 {...props}>{children}</h2>
    ),
    h3: ({ node, children, ...props }) => (
      <h3 {...props}>{children}</h3>
    ),
    h4: ({ node, children, ...props }) => (
      <h4 {...props}>{children}</h4>
    ),
    img: ({ node, ...props }) => (
      <img
        {...props}
        loading="lazy"
        className="rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
        alt={props.alt || ""}
        onClick={() => handleImageClick(props.src || "", props.alt || "")}
      />
    ),
    a: ({ node, children, ...props }) => (
      <a
        {...props}
        target={props.href?.startsWith("http") ? "_blank" : undefined}
        rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined}
        className="prose-link inline-flex items-center gap-1"
      >
        {children}
        {props.href?.startsWith("http") && (
          <ExternalLink className="size-3 opacity-40" />
        )}
      </a>
    ),
    blockquote: ({ node, children, ...props }) => (
      <blockquote {...props}>{children}</blockquote>
    ),
    hr: ({ node, ...props }) => (
      <hr {...props} />
    ),
    table: ({ node, children, ...props }) => (
      <div className="overflow-x-auto my-6 rounded-lg border border-border/40">
        <table {...props}>{children}</table>
      </div>
    ),
    ul: ({ node, children, ...props }) => (
      <ul {...props}>{children}</ul>
    ),
    ol: ({ node, children, ...props }) => (
      <ol {...props}>{children}</ol>
    ),
    li: ({ node, children, ...props }) => (
      <li {...props}>{children}</li>
    ),
    p: ({ node, children, ...props }) => (
      <p {...props}>{children}</p>
    ),
  };

  return (
    <>
      <div className={`prose ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
      <ImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </>
  );
}
