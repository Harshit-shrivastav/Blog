import { create } from "zustand";

export type PublicView = "blogs" | "notes" | "contact";

// ─── URL Sync Utilities ───
// These functions handle URL query param synchronization for shareable links.
// Format: ?blog=slug  for blogs, ?note=id  for notes

export function pushBlogUrl(slug: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("blog", slug);
  url.searchParams.delete("note");
  window.history.pushState({ blog: slug }, "", url.toString());
}

export function pushNoteUrl(id: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("note", id);
  url.searchParams.delete("blog");
  window.history.pushState({ note: id }, "", url.toString());
}

export function clearDetailUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("blog");
  url.searchParams.delete("note");
  window.history.pushState({}, "", url.toString());
}

export function getInitialParams(): { blogSlug: string | null; noteId: string | null } {
  if (typeof window === "undefined") return { blogSlug: null, noteId: null };
  const params = new URLSearchParams(window.location.search);
  return {
    blogSlug: params.get("blog"),
    noteId: params.get("note"),
  };
}

export function getBlogUrl(slug: string): string {
  if (typeof window === "undefined") return `/blog/${slug}`;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("blog", slug);
  return url.toString();
}

export function getNoteUrl(id: string): string {
  if (typeof window === "undefined") return `/note/${id}`;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("note", id);
  return url.toString();
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  tags: string[];
  status: string;
  publishedAt: string | null;
  viewCount: number;
  likeCount: number;
  readingTime: number;
  commentsEnabled: boolean;
  createdAt: string;
  series: { id: string; name: string; slug: string } | null;
}

export interface Note {
  id: string;
  content: string;
  images: string[];
  audioFiles: string[];
  audioCaptions: Record<string, string>;
  imageCaptions: Record<string, string>;
  isPublic: boolean;
  commentsEnabled: boolean;
  likeCount: number;
  saveCount: number;
  createdAt: string;
}

interface PublicStore {
  view: PublicView;
  setView: (view: PublicView) => void;
  selectedBlog: BlogPost | null;
  setSelectedBlog: (blog: BlogPost | null) => void;
  selectedNote: Note | null;
  setSelectedNote: (note: Note | null) => void;
  blogPage: number;
  setBlogPage: (page: number) => void;
  notePage: number;
  setNotePage: (page: number) => void;
  blogs: BlogPost[];
  setBlogs: (blogs: BlogPost[]) => void;
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  hasMoreBlogs: boolean;
  setHasMoreBlogs: (v: boolean) => void;
  hasMoreNotes: boolean;
  setHasMoreNotes: (v: boolean) => void;
  likes: Set<string>;
  setLikes: (likes: Set<string>) => void;
  toggleLike: (targetType: string, targetId: string) => void;
  saves: Set<string>;
  setSaves: (saves: Set<string>) => void;
  toggleSave: (targetType: string, targetId: string) => void;
  searchTag: string | null;
  setSearchTag: (tag: string | null) => void;
  showAbout: boolean;
  setShowAbout: (show: boolean) => void;
  showSeries: boolean;
  setShowSeries: (show: boolean) => void;
  showContact: boolean;
  setShowContact: (show: boolean) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;
  showReadingList: boolean;
  setShowReadingList: (show: boolean) => void;
  showWebHistory: boolean;
  setShowWebHistory: (show: boolean) => void;
  readingList: BlogPost[];
  setReadingList: (list: BlogPost[]) => void;
  addToReadingList: (blog: BlogPost) => void;
  removeFromReadingList: (id: string) => void;
  isInReadingList: (id: string) => boolean;
  readPosts: Set<string>;
  setReadPosts: (posts: Set<string>) => void;
  markAsRead: (id: string) => void;
}

export const usePublicStore = create<PublicStore>((set) => ({
  view: "blogs",
  setView: (view) => set({ view }),
  selectedBlog: null,
  setSelectedBlog: (blog) => {
    if (blog) {
      pushBlogUrl(blog.slug);
    } else {
      clearDetailUrl();
    }
    set({ selectedBlog: blog });
  },
  selectedNote: null,
  setSelectedNote: (note) => {
    if (note) {
      pushNoteUrl(note.id);
    } else {
      clearDetailUrl();
    }
    set({ selectedNote: note });
  },
  blogPage: 1,
  setBlogPage: (page) => set({ blogPage: page }),
  notePage: 1,
  setNotePage: (page) => set({ notePage: page }),
  blogs: [],
  setBlogs: (blogs) => set({ blogs }),
  notes: [],
  setNotes: (notes) => set({ notes }),
  hasMoreBlogs: true,
  setHasMoreBlogs: (v) => set({ hasMoreBlogs: v }),
  hasMoreNotes: true,
  setHasMoreNotes: (v) => set({ hasMoreNotes: v }),
  likes: new Set<string>(),
  setLikes: (likes) => set({ likes }),
  toggleLike: (targetType, targetId) =>
    set((state) => {
      const key = `${targetType}:${targetId}`;
      const newLikes = new Set(state.likes);
      if (newLikes.has(key)) newLikes.delete(key);
      else newLikes.add(key);
      return { likes: newLikes };
    }),
  saves: new Set<string>(),
  setSaves: (saves) => set({ saves }),
  toggleSave: (targetType, targetId) =>
    set((state) => {
      const key = `${targetType}:${targetId}`;
      const newSaves = new Set(state.saves);
      if (newSaves.has(key)) newSaves.delete(key);
      else newSaves.add(key);
      return { saves: newSaves };
    }),
  searchTag: null,
  setSearchTag: (tag) => set({ searchTag: tag }),
  showAbout: false,
  setShowAbout: (show) => set({ showAbout: show }),
  showSeries: false,
  setShowSeries: (show) => set({ showSeries: show }),
  showContact: false,
  setShowContact: (show) => set({ showContact: show }),
  showSearch: false,
  setShowSearch: (show) => set({ showSearch: show }),
  showShortcuts: false,
  setShowShortcuts: (show) => set({ showShortcuts: show }),
  showReadingList: false,
  setShowReadingList: (show) => set({ showReadingList: show }),
  showWebHistory: false,
  setShowWebHistory: (show) => set({ showWebHistory: show }),
  readingList: [],
  setReadingList: (list) => {
    set({ readingList: list });
    if (typeof window !== "undefined") {
      try { localStorage.setItem("blog-reading-list", JSON.stringify(list)); } catch {}
    }
  },
  addToReadingList: (blog) =>
    set((state) => {
      if (state.readingList.some((b) => b.id === blog.id)) return state;
      const newList = [...state.readingList, blog];
      if (typeof window !== "undefined") {
        try { localStorage.setItem("blog-reading-list", JSON.stringify(newList)); } catch {}
      }
      return { readingList: newList };
    }),
  removeFromReadingList: (id) =>
    set((state) => {
      const newList = state.readingList.filter((b) => b.id !== id);
      if (typeof window !== "undefined") {
        try { localStorage.setItem("blog-reading-list", JSON.stringify(newList)); } catch {}
      }
      return { readingList: newList };
    }),
  isInReadingList: (id) => {
    const state = usePublicStore.getState();
    return state.readingList.some((b) => b.id === id);
  },
  readPosts: new Set<string>(),
  setReadPosts: (posts) => {
    set({ readPosts: posts });
    if (typeof window !== "undefined") {
      try { localStorage.setItem("blog-read-posts", JSON.stringify([...posts])); } catch {}
    }
  },
  markAsRead: (id) =>
    set((state) => {
      const newRead = new Set(state.readPosts);
      newRead.add(id);
      if (typeof window !== "undefined") {
        try { localStorage.setItem("blog-read-posts", JSON.stringify([...newRead])); } catch {}
      }
      return { readPosts: newRead };
    }),
}));
