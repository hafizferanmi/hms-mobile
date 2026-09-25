# Staff & Roles + Room Types — Screen Map

## Staff & Roles

Both `StaffList.html` and `RolesList.html` are the same screen — a "Staff / Roles"
segmented control at the top switches between them.

```
StaffList.html (Staff tab, default)
  → tap segmented control → RolesList.html (Roles tab)
  → tap floating "Add staff" → AddStaff.html
        → Add staff → back to StaffList.html, new row added
        → Cancel → back to StaffList.html, unchanged

RolesList.html (Roles tab)
  → tap segmented control → StaffList.html (Staff tab)
  → tap "•••" on a role row → RoleActionsMenu.html   [bottom action sheet]
        → Edit role      → (not yet designed — would open a role-permissions form)
        → Duplicate role → (not yet designed)
        → Delete role    → back to RolesList.html, role removed
        → Close          → dismiss, back to RolesList.html
  → tap floating "Add role" → (not yet designed — would mirror AddStaff.html's pattern)
```

## Room Types

```
RoomTypesList.html
  → tap a room type row → RoomTypeDetail.html
        → tap "•••" → RoomTypeActionsMenu.html   [bottom action sheet]
              → Edit room type   → (not yet designed — would reuse AddRoomType.html's
                                     form, pre-filled)
              → Delete room type → back to RoomTypesList.html, type removed
              → Close            → dismiss, back to RoomTypeDetail.html
        → tap "Add room" tile in the room grid → AddRoom.html
              → Add room → back to RoomTypeDetail.html, new room chip added
              → Cancel   → back to RoomTypeDetail.html, unchanged
  → tap floating "Add room type" → AddRoomType.html
        → Add room type → back to RoomTypesList.html, new row added
        → Cancel        → back to RoomTypesList.html, unchanged
```

## Not yet designed

- Editing an existing role's permissions (a full permissions-picker screen)
- Adding a new role from scratch
- Editing an existing room type (would reuse `AddRoomType.html`'s layout, pre-filled)
- Editing or removing a single room once added

## Files in this folder

| File | What it is |
|---|---|
| `StaffList.html` | Staff tab — list of team member accounts |
| `RolesList.html` | Roles tab — list of roles with staff/permission counts |
| `AddStaff.html` | Invite a new staff member |
| `RoleActionsMenu.html` | "•••" action sheet for a role row |
| `RoomTypesList.html` | All room types with pricing |
| `RoomTypeDetail.html` | One room type's stats, pricing, and its physical rooms |
| `RoomTypeActionsMenu.html` | "•••" action sheet for a room type |
| `AddRoomType.html` | Define a new room type and its price model |
| `AddRoom.html` | Add a physical room to an existing room type |
