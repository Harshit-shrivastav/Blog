"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { compressImage } from "@/lib/admin-utils";
import { cn } from "@/lib/utils";
import "@/styles/tiptap.css";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  CodeSquare,
  Minus,
  ImagePlus,
  Link as LinkIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Highlighter,
  Type,
  Check,
  X,
  Undo2,
  Redo2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

/* ---------- Lowlight setup ---------- */
const lowlight = createLowlight(common);

/* ---------- Props ---------- */
export interface TiptapEditorProps {
  content: string;
  onUpdate?: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

/* ---------- Toolbar Button ---------- */
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  tooltip,
  children,
}: ToolbarButtonProps) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center h-9 w-9 sm:h-8 sm:w-8 rounded-md transition-colors touch-manipulation",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:opacity-40 disabled:pointer-events-none",
        isActive && "bg-accent text-accent-foreground shadow-sm"
      )}
    >
      {children}
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/* ---------- Separator ---------- */
function ToolbarSeparator() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />;
}

/* ---------- Color Picker Button ---------- */
interface ColorPickerButtonProps {
  onColorChange: (color: string) => void;
  tooltip: string;
  currentColor?: string;
  children: React.ReactNode;
}

function ColorPickerButton({
  onColorChange,
  tooltip,
  currentColor,
  children,
}: ColorPickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex items-center justify-center h-9 w-9 sm:h-8 sm:w-8 rounded-md transition-colors touch-manipulation",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring relative"
          )}
        >
          {children}
          {currentColor && (
            <span
              className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-background"
              style={{ backgroundColor: currentColor }}
            />
          )}
          <input
            ref={inputRef}
            type="color"
            className="sr-only"
            value={currentColor || "#000000"}
            onChange={(e) => onColorChange(e.target.value)}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/* ---------- Highlight Color Button ---------- */
interface HighlightButtonProps {
  onHighlight: (color: string) => void;
  tooltip: string;
  children: React.ReactNode;
}

function HighlightButton({ onHighlight, tooltip, children }: HighlightButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex items-center justify-center h-9 w-9 sm:h-8 sm:w-8 rounded-md transition-colors touch-manipulation",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        >
          {children}
          <input
            ref={inputRef}
            type="color"
            className="sr-only"
            defaultValue="#fef08a"
            onChange={(e) => onHighlight(e.target.value)}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/* ===================================================================
   TiptapEditor Component
   =================================================================== */
export function TiptapEditor({
  content,
  onUpdate,
  placeholder = "Start writing...",
  className,
  editable = true,
}: TiptapEditorProps) {
  /* ---- Link inline input state ---- */
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  /* ---- Image file input ref ---- */
  const imageInputRef = useRef<HTMLInputElement>(null);

  /* ---- Editor ---- */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Color,
      TextStyle,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      Subscript,
      Superscript,
      YouTube.configure({
        HTMLAttributes: { class: "rounded-lg" },
      }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content,
    editable,
    onUpdate: ({ editor: ed }) => {
      onUpdate?.(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap",
      },
    },
  });

  /* Focus link input when it appears */
  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [showLinkInput]);

  /* Sync content prop when it changes externally */
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentHTML = editor.getHTML();
      if (currentHTML !== content) {
        editor.commands.setContent(content, false);
      }
    }
  }, [content, editor]);

  /* ---- Image upload handler ---- */
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      try {
        const base64 = await compressImage(file);
        editor.chain().focus().setImage({ src: base64 }).run();
      } catch {
        // If compression fails, try inserting raw
        try {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            editor.chain().focus().setImage({ src: result }).run();
          };
          reader.readAsDataURL(file);
        } catch {
          // Silent fail
        }
      }

      // Reset input so same file can be uploaded again
      e.target.value = "";
    },
    [editor]
  );

  /* ---- Link handlers ---- */
  const handleOpenLinkInput = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    if (previousUrl) {
      // If already a link, toggle it off
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setShowLinkInput(false);
      setLinkUrl("");
      return;
    }
    setShowLinkInput(true);
    setLinkUrl("");
  }, [editor]);

  const handleSetLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      setShowLinkInput(false);
      setLinkUrl("");
      return;
    }

    let url = linkUrl.trim();
    // Auto-prepend https:// if no protocol
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();

    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const handleCancelLink = useCallback(() => {
    setShowLinkInput(false);
    setLinkUrl("");
    editor?.chain().focus().run();
  }, [editor]);

  const handleLinkKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSetLink();
      }
      if (e.key === "Escape") {
        handleCancelLink();
      }
    },
    [handleSetLink, handleCancelLink]
  );

  /* ---- Insert table handler ---- */
  const handleInsertTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  /* ---- Table column/row operations ---- */
  const addTableColumn = useCallback(() => {
    editor?.chain().focus().addColumnAfter().run();
  }, [editor]);

  const addTableRow = useCallback(() => {
    editor?.chain().focus().addRowAfter().run();
  }, [editor]);

  const deleteTableColumn = useCallback(() => {
    editor?.chain().focus().deleteColumn().run();
  }, [editor]);

  const deleteTableRow = useCallback(() => {
    editor?.chain().focus().deleteRow().run();
  }, [editor]);

  const deleteTable = useCallback(() => {
    editor?.chain().focus().deleteTable().run();
  }, [editor]);

  const isInTable = editor?.isActive("table");

  if (!editor) return null;

  return (
    <div className={cn("flex flex-col w-full", className)}>
      {/* ===== Toolbar ===== */}
      <div className="shrink-0 border-b border-border bg-background">
        {/* Main toolbar row - scrollable on mobile */}
        <div className="overflow-x-auto">
          <div className="flex items-center gap-0.5 px-2 py-1.5 min-w-max">
            {/* Undo / Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              tooltip="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              tooltip="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Text Type: Heading / Paragraph */}
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              isActive={editor.isActive("heading", { level: 1 })}
              tooltip="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
              tooltip="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive("heading", { level: 3 })}
              tooltip="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setParagraph().run()}
              isActive={
                editor.isActive("paragraph") && !editor.isActive("heading")
              }
              tooltip="Paragraph"
            >
              <Pilcrow className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              tooltip="Bold"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              tooltip="Italic"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive("underline")}
              tooltip="Underline"
            >
              <UnderlineIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive("strike")}
              tooltip="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive("code")}
              tooltip="Inline Code"
            >
              <Code className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Color & Highlight */}
            <ColorPickerButton
              onColorChange={(color) =>
                editor.chain().focus().setColor(color).run()
              }
              tooltip="Text Color"
              currentColor={editor.getAttributes("textStyle").color}
            >
              <Type className="h-4 w-4" />
            </ColorPickerButton>
            <HighlightButton
              onHighlight={(color) =>
                editor.chain().focus().toggleHighlight({ color }).run()
              }
              tooltip="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </HighlightButton>

            <ToolbarSeparator />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              tooltip="Bullet List"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              tooltip="Ordered List"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive("taskList")}
              tooltip="Task List"
            >
              <ListChecks className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Text Alignment */}
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("left").run()
              }
              isActive={editor.isActive({ textAlign: "left" })}
              tooltip="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              isActive={editor.isActive({ textAlign: "center" })}
              tooltip="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("right").run()
              }
              isActive={editor.isActive({ textAlign: "right" })}
              tooltip="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              isActive={editor.isActive({ textAlign: "justify" })}
              tooltip="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Block Elements */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              tooltip="Blockquote"
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive("codeBlock")}
              tooltip="Code Block"
            >
              <CodeSquare className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              tooltip="Horizontal Rule"
            >
              <Minus className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Insert: Image, Link, Table, YouTube */}
            <ToolbarButton
              onClick={() => imageInputRef.current?.click()}
              tooltip="Insert Image"
            >
              <ImagePlus className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={handleOpenLinkInput}
              isActive={editor.isActive("link")}
              tooltip={editor.isActive("link") ? "Remove Link" : "Insert Link"}
            >
              <LinkIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={handleInsertTable}
              isActive={isInTable}
              tooltip="Insert Table"
            >
              <TableIcon className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSeparator />

            {/* Subscript / Superscript */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              isActive={editor.isActive("subscript")}
              tooltip="Subscript"
            >
              <SubscriptIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              isActive={editor.isActive("superscript")}
              tooltip="Superscript"
            >
              <SuperscriptIcon className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>

        {/* Table operations sub-toolbar (visible when cursor is in a table) */}
        {isInTable && (
          <div className="overflow-x-auto border-t border-border">
            <div className="flex items-center gap-0.5 px-2 py-1 sm:py-0.5 min-w-max">
              <span className="text-xs text-muted-foreground font-medium mr-1 shrink-0 leading-none">
                Table:
              </span>
              <ToolbarButton onClick={addTableColumn} tooltip="Add Column After">
                <PanelLeftClose className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={addTableRow} tooltip="Add Row After">
                <PanelLeftOpen className="h-4 w-4 rotate-90" />
              </ToolbarButton>
              <ToolbarButton
                onClick={deleteTableColumn}
                tooltip="Delete Column"
              >
                <PanelLeftClose className="h-4 w-4 text-destructive" />
              </ToolbarButton>
              <ToolbarButton onClick={deleteTableRow} tooltip="Delete Row">
                <PanelLeftOpen className="h-4 w-4 rotate-90 text-destructive" />
              </ToolbarButton>
              <ToolbarButton onClick={deleteTable} tooltip="Delete Table">
                <X className="h-4 w-4 text-destructive" />
              </ToolbarButton>
            </div>
          </div>
        )}

        {/* Link inline input (visible when adding/editing a link) */}
        {showLinkInput && (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-muted/30">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={linkInputRef}
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={handleLinkKeyDown}
              placeholder="Paste or type a URL..."
              className="flex-1 h-8 bg-background border border-input rounded-md px-3 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground min-w-0"
            />
            <button
              type="button"
              onClick={handleSetLink}
              className="inline-flex items-center justify-center h-9 sm:h-8 px-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 touch-manipulation"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleCancelLink}
              className="inline-flex items-center justify-center h-9 sm:h-8 px-2 rounded-md bg-muted hover:bg-accent transition-colors shrink-0 touch-manipulation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ===== Editor Content ===== */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}