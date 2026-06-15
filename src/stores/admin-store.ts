import { create } from "zustand";

export interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  avatar: string | null;
}

interface AdminStore {
  isAdmin: boolean;
  admin: AdminUser | null;
  setAdmin: (admin: AdminUser) => void;
  clearAdmin: () => void;
  currentSection: string;
  setCurrentSection: (section: string, editingId?: string, noteId?: string) => void;
  editingBlogId: string | null;
  setEditingBlogId: (id: string | null) => void;
  editingNoteId: string | null;
  setEditingNoteId: (id: string | null) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  sidebarOpen: boolean; // for mobile
  setSidebarOpen: (open: boolean) => void;
  /** Re-read localStorage for cross-tab navigation (blog/note editing) */
  hydrateFromLocalStorage: () => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  isAdmin: false,
  admin: null,
  setAdmin: (admin) => set({ isAdmin: true, admin }),
  clearAdmin: () =>
    set({ isAdmin: false, admin: null, currentSection: "dashboard" }),
  currentSection: "dashboard",
  editingBlogId: null,
  setEditingBlogId: (id) => set({ editingBlogId: id }),
  editingNoteId: null,
  setEditingNoteId: (id) => set({ editingNoteId: id }),
  setCurrentSection: (section, editingId, noteId) => set({
    currentSection: section,
    sidebarOpen: false,
    ...(editingId ? { editingBlogId: editingId } : { editingBlogId: null }),
    ...(noteId ? { editingNoteId: noteId } : { editingNoteId: null }),
  }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  hydrateFromLocalStorage: () => {
    const blogId = localStorage.getItem("blog-editing-blog-id");
    const noteId = localStorage.getItem("blog-editing-note-id");
    const section = localStorage.getItem("blog-admin-section");

    if (blogId) {
      localStorage.removeItem("blog-editing-blog-id");
      localStorage.removeItem("blog-admin-section");
      set({ currentSection: "blog-editor", editingBlogId: blogId });
    } else if (noteId) {
      localStorage.removeItem("blog-editing-note-id");
      localStorage.removeItem("blog-admin-section");
      set({ currentSection: "note-editor", editingNoteId: noteId });
    } else if (section === "blog-editor" || section === "note-editor") {
      localStorage.removeItem("blog-admin-section");
      set({ currentSection: section });
    }
  },
}));
