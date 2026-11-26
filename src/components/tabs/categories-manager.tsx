"use client";

import React, { useState } from "react";
import { CategoryGlyph, EditIcon, SpinnerIcon, TrashIcon } from "../icons";
import { CATEGORY_ICON_OPTIONS } from "@/lib/validators";
import type { CategoryItem, CategoryType } from "@/lib/types";

interface CategoriesManagerProps {
  categories: CategoryItem[];
  onRefresh: () => Promise<void>;
}

export function CategoriesManager({
  categories,
  onRefresh,
}: CategoriesManagerProps) {
  const [listType, setListType] = useState<CategoryType>("EXPENSE");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CategoryType>("EXPENSE");
  const [newIcon, setNewIcon] = useState<string>("tag");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("tag");
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const visibleCategories = categories.filter((c) => c.type === listType);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setCreating(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          type: newType,
          icon: newIcon,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: json.error || "Failed to add category.",
        });
        setCreating(false);
        return;
      }
      setNewName("");
      setListType(newType);
      setFeedback({ type: "success", text: "Category created." });
      await onRefresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while creating category.",
      });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (cat: CategoryItem) => {
    setConfirmDeleteId(null);
    setFeedback(null);
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
  };

  const handleSaveEdit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setFeedback(null);
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, icon: editIcon }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: json.error || "Failed to update category.",
        });
        setSavingEdit(false);
        return;
      }
      setEditingId(null);
      setFeedback({ type: "success", text: "Category updated." });
      await onRefresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while updating category.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: json.error || "Failed to delete category.",
        });
        return;
      }
      setConfirmDeleteId(null);
      setFeedback({ type: "success", text: "Category removed." });
      await onRefresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Network error while deleting category.",
      });
    }
  };

  return (
    <section className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[var(--ink)]">
          Manage Categories
        </h2>
        <div
          role="tablist"
          aria-label="Category type filter"
          className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
        >
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={listType === t}
              onClick={() => {
                setListType(t);
                setEditingId(null);
                setConfirmDeleteId(null);
              }}
              className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition-colors ${
                listType === t
                  ? "bg-[var(--surface-1)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t === "EXPENSE" ? "Expense" : "Income"}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`mt-3 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
            feedback.type === "error"
              ? "border border-[var(--expense)]/30 bg-[var(--expense-soft)] text-[var(--expense)]"
              : "border border-[var(--income)]/30 bg-[var(--income-soft)] text-[var(--income)]"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Existing categories list */}
      <ul className="mt-4 max-h-64 divide-y divide-[var(--border)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-3">
        {visibleCategories.map((cat) => {
          const isEditing = editingId === cat.id;
          const isConfirming = confirmDeleteId === cat.id;

          if (isEditing) {
            return (
              <li key={cat.id} className="py-3">
                <form
                  onSubmit={(e) => void handleSaveEdit(e, cat.id)}
                  className="space-y-2.5"
                >
                  <input
                    type="text"
                    required
                    maxLength={32}
                    aria-label="Category name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm text-[var(--ink)]"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setEditIcon(icon)}
                        aria-label={`Select ${icon} icon`}
                        aria-pressed={editIcon === icon}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                          editIcon === icon
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                            : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                        }`}
                      >
                        <CategoryGlyph icon={icon} className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="h-11 flex-1 rounded-xl bg-[var(--accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      {savingEdit ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--ink-muted)]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </li>
            );
          }

          return (
            <li
              key={cat.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-1)] text-[var(--ink)]">
                  <CategoryGlyph icon={cat.icon} className="h-4 w-4" />
                </span>
                <span className="truncate text-sm font-medium text-[var(--ink)]">
                  {cat.name}
                </span>
              </div>

              {isConfirming ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void handleDelete(cat.id)}
                    className="min-h-11 rounded-lg bg-[var(--expense)] px-3 text-xs font-semibold text-white"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs font-medium text-[var(--ink-muted)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => startEdit(cat)}
                    aria-label={`Edit category ${cat.name}`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-1)] hover:text-[var(--accent-text)]"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  {visibleCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(cat.id)}
                      aria-label={`Delete category ${cat.name}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-1)] hover:text-[var(--expense)]"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Add new category form */}
      <form
        onSubmit={handleCreate}
        className="mt-4 space-y-3 border-t border-[var(--border)] pt-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
          Add Custom Category
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <label htmlFor="category-name" className="sr-only">
              Category Name
            </label>
            <input
              id="category-name"
              type="text"
              required
              maxLength={32}
              placeholder="Coffee, Gym, Hobby"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]"
            />
          </div>
          <div className="sm:col-span-5">
            <label htmlFor="category-type" className="sr-only">
              Category Type
            </label>
            <select
              id="category-type"
              value={newType}
              onChange={(e) => setNewType(e.target.value as CategoryType)}
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--ink)]"
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_ICON_OPTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setNewIcon(icon)}
              aria-label={`Choose ${icon} icon`}
              aria-pressed={newIcon === icon}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                newIcon === icon
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                  : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              <CategoryGlyph icon={icon} className="h-4 w-4" />
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={creating}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-[var(--ink)] hover:border-[var(--accent)] disabled:opacity-60"
        >
          {creating && <SpinnerIcon className="h-4 w-4" />}
          <span>{creating ? "Creating..." : "Create Category"}</span>
        </button>
      </form>
    </section>
  );
}
