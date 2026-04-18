import React, { useMemo, useState } from "react";
import { AttentionBox, Button, Dropdown, TextArea, TextField } from "@vibe/core";
import type { DropdownOption } from "@vibe/core";
import { createOrderItem } from "@/lib/monday";
import type { Fragrance } from "@/types/fragrance";

interface NewOrderTabProps {
  boardId?: number;
  fragrances: Fragrance[];
  onSubmitted: () => void;
}

const qtyPattern = /^\d+$/;

export function NewOrderTab({ boardId, fragrances, onSubmitted }: NewOrderTabProps) {
  const [selected, setSelected] = useState<[string, string, string]>(["", "", ""]);
  const [customer, setCustomer] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [inscription, setInscription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => fragrances.map((item) => ({ value: item.name, label: `${item.name} (${item.category})` })),
    [fragrances]
  );

  const uniqueCount = new Set(selected.filter(Boolean)).size;
  const validQuantity = qtyPattern.test(quantity) && Number(quantity) >= 1;
  const canSubmit = uniqueCount === 3 && customer.trim().length > 0 && validQuantity;

  const setSlot = (index: 0 | 1 | 2, value: string) => {
    const next = [...selected] as [string, string, string];
    next[index] = value;
    setSelected(next);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setError(null);
    setFeedback(null);
    setIsSaving(true);
    try {
      await createOrderItem({
        boardId,
        customer: customer.trim(),
        scents: selected,
        quantity: Number(quantity),
        inscription: inscription.trim(),
      });
      setFeedback("Order submitted to Production Orders board.");
      setSelected(["", "", ""]);
      setCustomer("");
      setQuantity("1");
      setInscription("");
      onSubmitted();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Order submission failed.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const getDropdownValue = (value: string): DropdownOption | null =>
    options.find((option) => option.value === value) ?? null;

  return (
    <div className="panel">
      <div>
        <p className="panel-title">New Order</p>
        <p className="panel-subtitle">Select 3 distinct fragrances, fill in the order details, then submit.</p>
      </div>

      <hr className="section-divider" />

      <div>
        <div className="field-label">Scent profiles</div>
        <div className="fragrance-grid">
          {([0, 1, 2] as const).map((slot) => (
            <div key={slot}>
              <div className="fragrance-slot-label">
                <span className="fragrance-slot-badge">{slot + 1}</span>
                Fragrance {slot + 1}
              </div>
              <Dropdown
                options={options}
                value={getDropdownValue(selected[slot])}
                onChange={(option) => {
                  const value = Array.isArray(option) ? option[0]?.value : option?.value;
                  setSlot(slot, String(value ?? ""));
                }}
                placeholder="Select scent…"
                clearable
              />
            </div>
          ))}
        </div>
      </div>

      <hr className="section-divider" />

      <div className="field-row">
        <TextField
          title="Customer / company name"
          value={customer}
          onChange={(value) => setCustomer(value)}
          placeholder="ACME Corp"
        />
        <div className="qty-field">
          <TextField
            title="Qty (kits)"
            type="number"
            value={quantity}
            onChange={(value) => setQuantity(value)}
            placeholder="1"
          />
        </div>
      </div>

      <TextArea
        title="Personalized inscription (optional)"
        value={inscription}
        onChange={(event) => setInscription(event.target.value)}
        placeholder="Happy Anniversary, Team!"
      />

      {uniqueCount !== 3 && uniqueCount > 0 && (
        <AttentionBox type="warning" text="Select 3 distinct fragrances to continue." />
      )}
      {error && <AttentionBox type="danger" text={error} />}
      {feedback && <AttentionBox type="success" text={feedback} />}

      <div className="submit-row">
        <span className="hint">
          {uniqueCount === 3 ? `${uniqueCount} fragrances selected ✓` : `${uniqueCount}/3 fragrances selected`}
        </span>
        <Button onClick={handleSubmit} disabled={!canSubmit || isSaving} loading={isSaving}>
          Submit Order
        </Button>
      </div>
    </div>
  );
}
