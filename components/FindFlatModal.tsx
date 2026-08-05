"use client";

import { useMemo, useState } from "react";
import { distanceKm } from "@/lib/geo";
import {
  Bhk,
  BHK_OPTIONS,
  FLATMATE_GENDER_OPTIONS,
  FlatmateGender,
  FOOD_PREF_OPTIONS,
  FoodPref,
  GENDER_OPTIONS,
  Gender,
  inrShort,
  MatchPreviewItem,
  MOVE_IN_OPTIONS,
  MoveIn,
  NewSeeker,
  RentPin,
  SMOKER_PREF_OPTIONS,
  SmokerPref,
} from "@/lib/types";
import { isValidEmail, toE164 } from "@/lib/validate";
import Turnstile from "./Turnstile";
import { Chip as BaseChip, Field, Modal } from "./ui";

interface Props {
  location: { lat: number; lng: number };
  pins: RentPin[];
  /**
   * When set, the form runs in "I'm interested in this flat" mode: budget,
   * size and room-vs-flat are pre-filled from the listing, and phone becomes
   * required so the owner can actually reach the seeker.
   */
  interest?: MatchPreviewItem | null;
  onClose: () => void;
  onSubmit: (seeker: NewSeeker) => Promise<void>;
}

/** "1BHK ₹15K (67 pins) · 2BHK ₹30K (70 pins)" for pins within 2 km. */
function medianHint(pins: RentPin[], lat: number, lng: number): string | null {
  const nearby = pins.filter((p) => distanceKm(lat, lng, p.lat, p.lng) <= 2);
  const byBhk = new Map<Bhk, number[]>();
  for (const p of nearby) {
    const arr = byBhk.get(p.bhk) ?? [];
    arr.push(p.rent);
    byBhk.set(p.bhk, arr);
  }
  const parts = [...byBhk.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .sort((a, b) => BHK_OPTIONS.indexOf(a[0]) - BHK_OPTIONS.indexOf(b[0]))
    .map(([bhk, rents]) => {
      rents.sort((a, b) => a - b);
      const median = rents[Math.floor(rents.length / 2)];
      return `${bhk} ₹${inrShort(median)} (${rents.length} ${rents.length === 1 ? "pin" : "pins"})`;
    });
  return parts.length > 0 ? parts.join(" · ") : null;
}

function interestDescription(item: MatchPreviewItem): string {
  return item.whole_flat
    ? `a ${item.bhk} ${item.furnishing.toLowerCase()} flat · ₹${inrShort(item.rent)}/month`
    : `a room in a ${item.bhk} shared flat · ₹${inrShort(item.rent)}/month per room`;
}

function Chip(props: Omit<React.ComponentProps<typeof BaseChip>, "accent">) {
  return <BaseChip accent="orange" {...props} />;
}

const asBhk = (v: string): Bhk =>
  (BHK_OPTIONS as string[]).includes(v) ? (v as Bhk) : "1BHK";

export default function FindFlatModal({
  location,
  pins,
  interest = null,
  onClose,
  onSubmit,
}: Props) {
  const [budget, setBudget] = useState(interest ? String(interest.rent) : "");
  const hint = useMemo(
    () => medianHint(pins, location.lat, location.lng),
    [pins, location.lat, location.lng],
  );
  const [bhk, setBhk] = useState<Bhk>(interest ? asBhk(interest.bhk) : "1BHK");
  const [roomOk, setRoomOk] = useState(interest ? !interest.whole_flat : false);
  const [veg, setVeg] = useState(false);
  const [smoker, setSmoker] = useState(false);
  const [moveIn, setMoveIn] = useState<MoveIn>("Flexible");
  const [foodPref, setFoodPref] = useState<FoodPref>("Any");
  const [smokerPref, setSmokerPref] = useState<SmokerPref>("Any");
  const [gender, setGender] = useState<Gender | null>(null);
  const [flatmateGender, setFlatmateGender] = useState<FlatmateGender>("Any");
  const [parkingNeeded, setParkingNeeded] = useState(false);
  const [lifestyle, setLifestyle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = Number(budget);
    if (
      !Number.isFinite(budgetNum) ||
      budgetNum < 1000 ||
      budgetNum > 2000000
    ) {
      setError("Enter a max budget between ₹1,000 and ₹20,00,000.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email - that's where your matches arrive.");
      return;
    }
    if (interest && !phone.trim()) {
      setError("Enter your phone number so the owner can reach you.");
      return;
    }
    const phoneE164 = phone.trim() ? toE164(phone) : null;
    if (phone.trim() && !phoneE164) {
      setError(
        "That phone number doesn't look right - use a 10-digit Indian mobile.",
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        lat: location.lat,
        lng: location.lng,
        budget_max: budgetNum,
        bhk,
        room_ok: roomOk,
        veg,
        smoker,
        contact_email: email.trim(),
        contact_phone: phoneE164,
        move_in: moveIn,
        food_pref: foodPref,
        smoker_pref: smokerPref,
        gender,
        flatmate_gender: flatmateGender,
        parking_needed: parkingNeeded,
        lifestyle: lifestyle.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold">
        {interest ? "Tell us about you" : "Find a flat near this spot"}
      </h2>
      {interest ? (
        <div className="mt-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-orange-800">
            You&apos;re expressing interest in {interestDescription(interest)}
          </p>
          <p className="mt-0.5 text-[11px] text-orange-700">
            Just tell us how to reach you and a few preferences - we&apos;ve
            pre-filled the rest. The owner gets your contact by email; you get
            theirs.
          </p>
        </div>
      ) : (
        <p className="mt-0.5 text-xs text-slate-500">
          You&apos;ll instantly see matching flats within 2.5&nbsp;km, and get
          owner contacts by email as new ones appear. Your pin expires after 30
          days.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">
            {interest
              ? "Your budget (₹/month, editable) - pre-filled from listing"
              : "Max budget (₹/month) *"}
          </span>
          <input
            type="number"
            required
            autoFocus={!interest}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="40000"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-600 focus:outline-none"
          />
          {hint && (
            <span className="mt-1 block text-[11px] text-slate-400">
              Median rent in 2km radius: {hint}
            </span>
          )}
        </label>

        {!interest && (
          <div>
            <span className="text-xs font-semibold text-slate-600">Size</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {BHK_OPTIONS.map((o) => (
                <Chip key={o} active={bhk === o} onClick={() => setBhk(o)}>
                  {o}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {!interest && (
            <Chip active={roomOk} onClick={() => setRoomOk(!roomOk)}>
              🛏️ Open to shared rooms
            </Chip>
          )}
          <Chip active={veg} onClick={() => setVeg(!veg)}>
            🥬 I&apos;m vegetarian
          </Chip>
          <Chip active={smoker} onClick={() => setSmoker(!smoker)}>
            🚬 I smoke
          </Chip>
          <Chip
            active={parkingNeeded}
            onClick={() => setParkingNeeded(!parkingNeeded)}
          >
            🚗 Parking required
          </Chip>
        </div>

        <Field label="Move-in timeline">
          {MOVE_IN_OPTIONS.map((o) => (
            <Chip key={o} active={moveIn === o} onClick={() => setMoveIn(o)}>
              {o}
            </Chip>
          ))}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Food preference in flatmate">
            {FOOD_PREF_OPTIONS.map((o) => (
              <Chip
                key={o}
                active={foodPref === o}
                onClick={() => setFoodPref(o)}
              >
                {o === "Veg" ? "🥬 Veg" : o === "Non-veg" ? "🍗 Non-veg" : "Any"}
              </Chip>
            ))}
          </Field>
          <Field label="Okay with a flatmate who smokes?">
            {SMOKER_PREF_OPTIONS.map((o) => (
              <Chip
                key={o}
                active={smokerPref === o}
                onClick={() => setSmokerPref(o)}
              >
                {o === "Smoker"
                  ? "🚬 Smoker"
                  : o === "Non-smoker"
                    ? "🚭 Non-smoker"
                    : "No preference"}
              </Chip>
            ))}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="You are (optional, helps matching)">
            {GENDER_OPTIONS.map((o) => (
              <Chip
                key={o}
                active={gender === o}
                onClick={() => setGender(gender === o ? null : o)}
              >
                {o}
              </Chip>
            ))}
          </Field>
          <Field label="Flatmate gender you're comfortable with">
            {FLATMATE_GENDER_OPTIONS.map((o) => (
              <Chip
                key={o}
                active={flatmateGender === o}
                onClick={() => setFlatmateGender(o)}
              >
                {o}
              </Chip>
            ))}
          </Field>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-slate-600">
            Tell us about your lifestyle (optional)
          </span>
          <textarea
            maxLength={280}
            rows={2}
            value={lifestyle}
            onChange={(e) => setLifestyle(e.target.value)}
            placeholder="e.g. Night owl, WFH 3 days a week, love cooking on weekends, quiet during weekdays"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-600 focus:outline-none"
          />
          <span className="mt-0.5 block text-[11px] text-slate-400">
            Sleep pattern, cooking, WFH, pets, noise tolerance - anything that
            helps a potential flatmate know if you&apos;d click.
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              Email *
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-600 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              Phone{interest ? " *" : ""}
            </span>
            <input
              type="tel"
              required={!!interest}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98XXXXXXXX"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-600 focus:outline-none"
            />
          </label>
        </div>
        <p className="-mt-2 text-[11px] text-slate-400">
          Private - only shared over email when a flat matches you.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <Turnstile />

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
          >
            {interest ? "Cancel" : "Back"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[2] rounded-xl bg-orange-700 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : interest
                ? "Drop seeker pin"
                : "Show my matches"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
