"use client";

import { Fragment } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  SquareCheckBig,
  Link as LinkIcon,
  Image as ImageIcon,
  Type,
  Quote,
  Minus,
  Table as TableIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ToolbarAction {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  action: () => void;
}

interface ToolbarGroup {
  items: ToolbarAction[];
}

export interface MarkdownToolbarProps {
  onInsert: (prefix: string, suffix: string, placeholder: string) => void;
  onImageClick?: () => void;
  className?: string;
}

export function MarkdownToolbar({ onInsert, onImageClick, className }: MarkdownToolbarProps) {
  const groups: ToolbarGroup[] = [
    {
      items: [
        { icon: Bold, label: "Bold", shortcut: "Ctrl+B", action: () => onInsert("**", "**", "bold text") },
        { icon: Italic, label: "Italic", shortcut: "Ctrl+I", action: () => onInsert("_", "_", "italic text") },
        { icon: Strikethrough, label: "Strikethrough", shortcut: "Ctrl+D", action: () => onInsert("~~", "~~", "strikethrough") },
        { icon: Code, label: "Inline Code", shortcut: "Ctrl+E", action: () => onInsert("`", "`", "code") },
      ],
    },
    {
      items: [
        { icon: Heading1, label: "Heading 1", action: () => onInsert("# ", "", "Heading 1") },
        { icon: Heading2, label: "Heading 2", action: () => onInsert("## ", "", "Heading 2") },
        { icon: Heading3, label: "Heading 3", action: () => onInsert("### ", "", "Heading 3") },
      ],
    },
    {
      items: [
        { icon: List, label: "Unordered List", action: () => onInsert("- ", "", "list item") },
        { icon: ListOrdered, label: "Ordered List", action: () => onInsert("1. ", "", "list item") },
        { icon: SquareCheckBig, label: "Task List", action: () => onInsert("- [ ] ", "", "task item") },
      ],
    },
    {
      items: [
        { icon: LinkIcon, label: "Link", shortcut: "Ctrl+K", action: () => onInsert("[", "](url)", "link text") },
        ...(onImageClick
          ? [{ icon: ImageIcon, label: "Image", action: onImageClick }]
          : [{ icon: ImageIcon, label: "Image", shortcut: "", action: () => onInsert("![", "](url)", "alt text") }]),
        { icon: Type, label: "Code Block", action: () => onInsert("\n```\n", "\n```\n", "code block") },
        { icon: Quote, label: "Blockquote", action: () => onInsert("> ", "", "quote") },
        { icon: Minus, label: "Horizontal Rule", action: () => onInsert("\n---\n", "") },
        { icon: TableIcon, label: "Table", action: () => onInsert("\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n", "") },
      ],
    },
    {
      items: [
        { icon: Undo2, label: "Undo", shortcut: "Ctrl+Z", action: () => document.execCommand("undo") },
        { icon: Redo2, label: "Redo", shortcut: "Ctrl+Y", action: () => document.execCommand("redo") },
      ],
    },
  ];

  return (
    <div className={cn("flex items-center gap-0.5 flex-wrap bg-muted/30 rounded-lg p-0.5", className)}>
      {groups.map((group, groupIdx) => (
        <Fragment key={groupIdx}>
          {groupIdx > 0 && <Separator orientation="vertical" className="h-4 mx-1" />}
          {group.items.map((btn) => (
            <Tooltip key={btn.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors duration-150"
                  onClick={btn.action}
                >
                  <btn.icon className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <span>{btn.label}</span>
                {btn.shortcut && (
                  <kbd className="ml-1.5 px-1 py-0.5 rounded border border-primary-foreground/20 bg-primary-foreground/10 text-[9px] font-mono">
                    {btn.shortcut}
                  </kbd>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
