import React, { useMemo, useState } from "react";
import { AttentionBox, Button, Dropdown, TextArea, TextField } from "@vibe/core";
import type { DropdownOption } from "@vibe/core";
import { createOrderItem } from "@/lib/monday";
import type { ScentRef } from "@/lib/monday";
import { formatUsPhoneMask } from "@/lib/usPhone";
import type { Fragrance } from "@/types/fragrance";

interface NewOrderTabProps {
  boardId?: number;
  fragrances: Fragrance[];
  scentCategories: string[];
  onSubmitted: () => void;
}

const qtyPattern = /^\d+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewOrderTab({ boardId, fragrances, scentCategories, onSubmitted }: NewOrderTabProps) {
  const [selected, setSelected] = useState<[string, string, string]>(["", "", ""]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [inscription, setInscription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => fragrances.map((item) => ({ value: item.name, label: `${item.name} (${item.category})` })),
    [fragrances]
  );
  const fragranceByName = useMemo(() => new Map(fragrances.map((item) => [item.name, item])), [fragrances]);
  const validCategorySet = useMemo(() => new Set(scentCategories), [scentCategories]);

  const uniqueCount = new Set(selected.filter(Boolean)).size;
  const validQuantity = qtyPattern.test(quantity) && Number(quantity) >= 1;

  const requiredContactOk =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    address.trim().length > 0 &&
    emailPattern.test(email.trim());

  const canSubmit = uniqueCount === 3 && requiredContactOk && validQuantity;

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
      const scents = selected.map((name) => {
        const match = fragranceByName.get(name);
        if (!match) {
          throw new Error(`Selected fragrance '${name}' was not found.`);
        }
        if (scentCategories.length > 0 && !validCategorySet.has(match.category)) {
          throw new Error(`Category '${match.category}' is not configured on the board.`);
        }
        return { name: match.name, category: match.category };
      }) as [ScentRef, ScentRef, ScentRef];

      await createOrderItem({
        boardId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        address: address.trim(),
        scents,
        quantity: Number(quantity),
        inscription: inscription.trim(),
      });
      setFeedback("Order submitted to Production Orders board.");
      setSelected(["", "", ""]);
      setFirstName("");
      setLastName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setAddress("");
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
        <div className="section-label-row">
          <span className="field-label section-label-row-title">Scent profiles</span>
          <span className="section-label-row-meta">
            {uniqueCount === 3 ? `${uniqueCount} fragrances selected ✓` : `${uniqueCount}/3 fragrances selected`}
          </span>
        </div>
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

      <div className="col-gap">
        <div>
          <div className="field-label">Customer details</div>
          <p className="field-required-note">
            <span className="field-required-asterisk" aria-hidden="true">
              *
            </span>{" "}
            Required field
          </p>
        </div>
        <div className="field-row field-row-two">
          <TextField
            title="First name"
            required
            requiredErrorText="Required"
            value={firstName}
            onChange={(value) => setFirstName(value)}
            placeholder="Jane"
          />
          <TextField
            title="Last name"
            required
            requiredErrorText="Required"
            value={lastName}
            onChange={(value) => setLastName(value)}
            placeholder="Doe"
          />
        </div>
        <TextField
          title="Company (optional)"
          value={company}
          onChange={(value) => setCompany(value)}
          placeholder="ACME Corp"
        />
        <div className="field-row field-row-two">
          <TextField
            title="Email"
            required
            requiredErrorText="Required"
            type="email"
            value={email}
            onChange={(value) => setEmail(value)}
            placeholder="jane@example.com"
          />
          <TextField
            title="Phone (optional)"
            value={phone}
            onChange={(value) => setPhone(formatUsPhoneMask(value))}
            placeholder="555-123-4567"
          />
        </div>
        <div className="field-row field-row-addr-qty">
          <TextField
            title="Client shipping address"
            required
            requiredErrorText="Required"
            value={address}
            onChange={(value) => setAddress(value)}
            placeholder="Street, city, state, ZIP"
          />
          <TextField
            title="Quantity (kits)"
            type="number"
            value={quantity}
            onChange={(value) => setQuantity(value)}
            placeholder="1"
          />
        </div>
      </div>

      <hr className="section-divider" />

      <TextArea
        label="Personalized inscription (optional)"
        value={inscription}
        onChange={(event) => setInscription(event.target.value)}
        placeholder="Happy Anniversary, Team!"
      />

      {error && <AttentionBox type="danger" text={error} />}
      {feedback && <AttentionBox type="success" text={feedback} />}

      <div className="submit-row">
        <Button onClick={handleSubmit} disabled={!canSubmit || isSaving} loading={isSaving}>
          Submit Order
        </Button>
      </div>
    </div>
  );
}
