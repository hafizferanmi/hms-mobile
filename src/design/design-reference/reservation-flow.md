# Reservation Flow — Screen Map

This covers every reservation and guest-management screen designed so far, and how
they connect. Hand this whole folder to Claude Code (or any AI) alongside your
theme tokens so it understands not just what each screen looks like, but what
happens when someone taps something on it.

There are two separate entry points into reservations — keep them as two flows,
not one:

## Flow A — Arrivals/Departures dashboard (from Home)

```
Home (tap "Arriving/Departing/New" stat)
  → Reservations.html            [Arrivals Today / Arrived / Departures Today tabs]
      → tap filter icon → Filter.html   [status + room-type filter, bottom sheet]
          → Apply → back to Reservations.html, list re-filtered
          → close (X) → back to Reservations.html, unchanged
```

## Flow B — Guest search & reservation detail (main flow)

```
Reservations tab / bottom nav
  → ReservationsList.html         [search bar, "Today ⌄", "Filter", guest rows]
      → tap "Filter" → ReservationsFilterStatus.html   [bottom sheet, status chips]
          → Apply filters → back to ReservationsList.html, filtered
          → Clear all → resets, sheet stays open
      → tap "Today ⌄" → ReservationsDateRange.html     [bottom sheet, calendar]
          → Apply → back to ReservationsList.html, range applied
      → tap a guest row → ReservationDetail.html (see below)
```

## Reservation Detail — the hub screen

Two states of the same screen, depending on the guest's status:

- **ReservationDetail.html** — status = RESERVED, footer button = "Check In"
- **ReservationDetailInHouse.html** — status = IN HOUSE, footer button = "Check Out"

Both share the same header and segmented control (Guest Info / Charges / Others):

```
ReservationDetail.html (Guest Info tab, shown by default)
  → segmented control → "Charges"
        → ReservationCharges.html          if the folio is empty
        → ReservationChargesFilled.html    once at least one charge/payment exists
  → segmented control → "Others"
        → ReservationActivity.html         [read-only activity timeline]

  → tap pencil (edit) icon → EditGuest.html
        → Save changes → back to ReservationDetail.html, fields updated
        → Cancel → back to ReservationDetail.html, unchanged

  → tap "•••" (more) icon → ReservationMoreMenu.html   [bottom action sheet]
        → Email guest      → opens native mail composer (no new screen)
        → Print invoice    → opens native print (no new screen)
        → Extend stay      → (not yet designed — would open a date-extension screen)
        → Cancel reservation → (not yet designed — would open a cancel-confirmation)
        → Close            → dismiss sheet, back to ReservationDetail.html

  → tap "Add" next to Additional Guests → AddVisitors.html
        → Add visitor → back to ReservationDetail.html, visitor added
        → Cancel → back to ReservationDetail.html, unchanged

  → tap footer "Check In" → ReservationCheckInConfirm.html   [confirmation card]
        → "Yes, check in" → guest status flips to IN HOUSE
                            → now showing ReservationDetailInHouse.html
        → "Cancel" → dismiss, back to ReservationDetail.html
```

`ReservationDetailInHouse.html` follows the same tab/edit/more-menu pattern as
above — its "Others" tab is `ReservationActivity.html`, its "Charges" tab is
whichever of the two Charges screens matches the folio state. Its footer
"Check Out" button would lead to a check-out confirmation (not yet designed,
mirrors `ReservationCheckInConfirm.html`).

## Charges tab — adding money in and out

```
ReservationCharges.html / ReservationChargesFilled.html
  → tap "Add charge" → AddCharge.html        [category grid, description, amount]
        → Add charge → back to Charges tab, now showing ReservationChargesFilled.html
        → Cancel → back to Charges tab, unchanged
  → tap "Record payment" → RecordPayment.html [amount, Half/Full, payment method]
        → Record payment → back to Charges tab, balance reduced
        → Cancel → back to Charges tab, unchanged
  → tap "Print invoice" / "Email invoice" (or "Share invoice") → native share/print,
    no new screen
```

## Screens with no further navigation (dead ends by design)

- `ReservationActivity.html` — read-only, nothing to tap into
- Every bottom sheet's "Cancel" / "X" / "Close" — always returns to the exact
  screen it was opened from, with no changes applied

## Files in this folder

| File | What it is |
|---|---|
| `Reservations.html` | Arrivals/Arrived/Departures dashboard (from Home) |
| `Filter.html` | Status filter sheet for the dashboard above |
| `ReservationsList.html` | Guest search list (main entry point) |
| `ReservationsFilterStatus.html` | Status filter sheet for the guest list |
| `ReservationsDateRange.html` | Date range sheet (with calendar) for the guest list |
| `ReservationDetail.html` | Guest Info tab, RESERVED state |
| `ReservationDetailInHouse.html` | Guest Info tab, IN HOUSE state |
| `ReservationCharges.html` | Charges tab, empty folio |
| `ReservationChargesFilled.html` | Charges tab, populated folio |
| `ReservationActivity.html` | Others tab — activity timeline |
| `ReservationMoreMenu.html` | "•••" action sheet |
| `ReservationCheckInConfirm.html` | Check-in confirmation card |
| `EditGuest.html` | Edit guest details / stay details form |
| `AddVisitors.html` | Add additional guest(s) form |
| `AddCharge.html` | Add a charge to the folio |
| `RecordPayment.html` | Record a payment against the folio |
