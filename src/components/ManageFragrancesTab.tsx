import React, { useMemo, useState } from "react";
import { AttentionBox, Button, Dropdown, TextField } from "@vibe/core";
import type { DropdownOption } from "@vibe/core";
import { createFragrance, deleteFragrance, updateFragrance } from "@/api/fragranceApi";
import type { Fragrance, FragranceInput } from "@/types/fragrance";

const emptyForm: FragranceInput = {
  name: "",
  description: "",
  category: "",
};

interface ManageFragrancesTabProps {
  fragrances: Fragrance[];
  scentCategories: string[];
  onChanged: (next: Fragrance[]) => void;
}

export function ManageFragrancesTab({
  fragrances,
  scentCategories,
  onChanged,
}: ManageFragrancesTabProps) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FragranceInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    return fragrances.filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower) ||
        item.description.toLowerCase().includes(lower)
    );
  }, [fragrances, query]);

  const categoryOptions = useMemo(
    () => scentCategories.map((category) => ({ value: category, label: category })),
    [scentCategories]
  );

  const updateField = (key: keyof FragranceInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const onSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateFragrance(editingId, form);
        onChanged(fragrances.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await createFragrance(form);
        onChanged([...fragrances, created]);
      }
      resetForm();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Save failed.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    setError(null);
    try {
      await deleteFragrance(id);
      onChanged(fragrances.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Delete failed.";
      setError(message);
    }
  };

  const beginEdit = (fragrance: Fragrance) => {
    setEditingId(fragrance.id);
    setForm({
      name: fragrance.name,
      description: fragrance.description,
      category: fragrance.category,
    });
  };

  const formValid = form.name.trim() && form.description.trim() && form.category.trim();
  const categoryValue: DropdownOption | null =
    categoryOptions.find((option) => option.value === form.category) ?? null;

  return (
    <div className="panel">
      <div>
        <p className="panel-title">Fragrance Library</p>
        <p className="panel-subtitle">{fragrances.length} fragrance{fragrances.length !== 1 ? "s" : ""} in catalogue</p>
      </div>

      <div className="manage-layout">
        {/* Table column */}
        <div className="col-gap">
          <TextField
            value={query}
            onChange={(value) => setQuery(value)}
            placeholder="Search by name, category or description…"
          />

          <div className="table-wrap">
            <table className="fragrance-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-bold">{item.name}</td>
                    <td><span className="category-pill">{item.category}</span></td>
                    <td className="text-muted-truncate">{item.description}</td>
                    <td className="action-cell">
                      <Button size={Button.sizes.SMALL} kind={Button.kinds.TERTIARY} onClick={() => beginEdit(item)}>
                        Edit
                      </Button>
                      <Button
                        size={Button.sizes.SMALL}
                        kind={Button.kinds.SECONDARY}
                        onClick={() => onDelete(item.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-empty">
                      No fragrances found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form sidebar */}
        <div className="form-card">
          <p className="form-card-title">{editingId ? "✏️ Edit fragrance" : "＋ Add fragrance"}</p>

          <TextField
            title="Name"
            value={form.name}
            onChange={(value) => updateField("name", value)}
            placeholder="Vanilla Bourbon"
          />
          <div>
            <div className="field-label">Category</div>
            <Dropdown
              options={categoryOptions}
              value={categoryValue}
              onChange={(option) => {
                const value = Array.isArray(option) ? option[0]?.value : option?.value;
                updateField("category", String(value ?? ""));
              }}
              placeholder="Select category…"
            />
          </div>
          <TextField
            title="Description"
            value={form.description}
            onChange={(value) => updateField("description", value)}
            placeholder="Rich and warm profile…"
          />
          {error && <AttentionBox type="danger" text={error} />}

          <div className="action-cell">
            <Button disabled={!formValid || saving} loading={saving} onClick={onSubmit}>
              {editingId ? "Update" : "Add fragrance"}
            </Button>
            {editingId && (
              <Button kind={Button.kinds.TERTIARY} onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
