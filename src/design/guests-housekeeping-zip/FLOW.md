# Guest List + Housekeeping — Screen Map

## Guest List

```
GuestList.html
  → tap a guest row → GuestDetail.html
      → tap "Add tag" → AddTagSheet.html          [bottom sheet, categorized tag list]
            → tap an existing tag → tag added, back to GuestDetail.html
            → tap "Create a new tag" → NewTagSheet.html
                  → fill name + pick category → "Create tag" → new tag added,
                    back to GuestDetail.html
                  → "Cancel" → back to AddTagSheet.html
      → tap the message icon → opens native messaging (no new screen)
      → tap back chevron → back to GuestList.html
  → tap "New guest" (floating button) → (not yet designed — would reuse
    NewGuestForm.html's pattern from the reservation flow, without the
    room/rate fields since it's not tied to a booking)
```

## Housekeeping

```
Housekeeping.html
  → tap a room's status pill → RoomStatusMenu.html   [bottom sheet]
        → pick a new status → back to Housekeeping.html, room's status
          and left-accent color update
        → tap X → dismiss, back to Housekeeping.html, unchanged
  → tap a room number chip inside the turnover banner → (not yet designed —
    would scroll/highlight that room's row)
  → tap the date button (top right) → (not yet designed — would open a
    date picker to view another day's board)
```

## Files in this folder

| File | What it is |
|---|---|
| `GuestList.html` | Guest list with search, status/tag filters, and guest rows |
| `GuestDetail.html` | One guest's tags, stats, reservation history, and notes |
| `AddTagSheet.html` | Bottom sheet — pick an existing tag, grouped by category |
| `NewTagSheet.html` | Bottom sheet — create a new tag with name + category |
| `Housekeeping.html` | Room status board grouped by room type, with a turnover alert |
| `RoomStatusMenu.html` | Bottom sheet — change a room's housekeeping status |
