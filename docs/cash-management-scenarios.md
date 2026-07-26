## Manual verification plan for the chat screen

Start with these scenarios in this order. Use a clean test tenant and reset the selected register/date before each scenario.

### Test setup

Use:

- Test tenant: `Corely Cash E2E Tenant`
- Location: `Berlin Nail Salon E2E`
- Register: `E2E-KASSE-01`
- Language: Vietnamese
- Timezone: `Europe/Berlin`
- Test date: `22.07.2026`

Before each test:

1. Open the Cash Management assistant.
2. Select the correct location and register.
3. Confirm that the test date has no existing financial records.
4. Keep browser DevTools open to inspect network requests if needed.
5. Keep API logs open to see tool calls.
6. Reset the date before testing the next independent scenario.

---

# Scenario 1: General question must not create records

### User message

```text
Privatentnahme là gì?
```

### Expected assistant behaviour

The assistant should explain in Vietnamese:

- `Privatentnahme` means taking money from the business cash drawer for personal use.
- It does not reduce the recorded sales.
- It is different from `Bankeinzahlung`.

It may give a simple example.

### Must not happen

The assistant must not:

- Ask to save a real record.
- Show a confirmation card.
- Create a cash entry.
- Submit counted cash.
- Close a cash day.
- Show a real daily Kassenbericht preview.

### Expected tool activity

Allowed:

```text
explain_cashbook_term
```

Not allowed:

```text
prepare_cash_day_confirmation
confirm_cash_day_draft
create_cash_entry
submit_counted_cash
close_cash_day
```

### Manual verification

Check that:

- The answer appears normally in chat.
- No confirmation buttons appear.
- No new cash day appears in the dashboard.
- No financial entry exists for `22.07.2026`.

Normal conversation messages may still be stored.

---

# Scenario 2: Hypothetical example must not create records

### User message

```text
Nếu em lấy 100 € về dùng cá nhân thì ghi như nào?
```

### Expected assistant behaviour

The assistant should explain an example such as:

```text
Nếu em lấy 100 € từ quỹ để dùng cá nhân thì ghi:
Privatentnahme: 100,00 €
```

It should explain that the exact closing cash depends on:

- Previous closing cash
- Cash sales
- Other cash movements
- Physical cash remaining

### Expected follow-up

A suitable final sentence is:

```text
Đây là ví dụ. Corely chưa lưu giao dịch nào.
```

### Must not happen

- No real business date should be assumed.
- No financial record should be created.
- No counted cash should be submitted.
- No preview should be treated as an official daily report.

### Manual verification

Check:

- The response is clearly marked as an example.
- No confirmation card is shown.
- The database contains no cash entries for the test date.

---

# Scenario 3: Ambiguous withdrawal must trigger clarification

### User message

```text
Hôm nay em rút hết 129,60 € ra.
```

### Expected assistant response

The assistant must not immediately classify this as `Privatentnahme`.

It should ask something like:

```text
Em lấy 129,60 € ra để làm gì?

1. Dùng cá nhân
2. Nộp vào tài khoản ngân hàng của tiệm
3. Mua hàng hoặc trả chi phí cho tiệm
4. Tiền vẫn còn trong ngăn kéo
5. Trường hợp khác
```

### Manual verification before answering

Confirm that:

- No cash entry has been created.
- No counted cash has been submitted.
- No confirmation record has been consumed.
- No report preview appears.

### User reply

```text
Em dùng cá nhân.
```

### Expected assistant response

The assistant should now ask for missing information, for example:

```text
Sau khi lấy tiền ra, em đếm thực tế trong ngăn kéo còn bao nhiêu?
```

It may also ask:

```text
Doanh thu tiền mặt hôm nay là bao nhiêu?
```

or:

```text
Tiền cuối ngày hôm trước là bao nhiêu?
```

Only ask for information that is still missing.

### Pass criteria

The scenario passes when Corely:

- Does not guess.
- Asks one clear question at a time.
- Does not perform a write before confirmation.

---

# Scenario 4: Full private withdrawal

This is the first complete end-to-end scenario.

### User message

```text
Hôm nay khách trả tiền mặt tổng cộng 129,60 €.
Sáng trong quỹ không có tiền.
Cuối ngày em lấy toàn bộ 129,60 € về dùng cá nhân.
Trong ngăn kéo còn 0 €.
Có 4 khách.
```

### Expected extracted facts

```text
Business date: 22.07.2026
Previous closing cash: 0,00 €
Cash sales: 129,60 €
Private withdrawal: 129,60 €
Bank deposit: 0,00 €
Goods purchase: 0,00 €
Business expense: 0,00 €
Actual closing cash: 0,00 €
Customer count: 4
```

### Expected confirmation card

The assistant should show a structured summary before saving:

```text
Corely hiểu như sau:

Ngày: 22.07.2026
Doanh thu tiền mặt: 129,60 €
Privatentnahme: 129,60 €
Tiền cuối ngày hôm trước: 0,00 €
Tiền thật còn cuối ngày: 0,00 €
Số khách: 4
```

Actions:

```text
Xác nhận và lưu
Sửa thông tin
Giải thích phép tính
```

### Verify before confirmation

Before clicking **Xác nhận và lưu**, verify:

- No `CASH_SALE` entry exists.
- No `PRIVATE_WITHDRAWAL` entry exists.
- No counted-cash record exists.
- A pending confirmation may exist.
- The day is not closed.

### Click

```text
Xác nhận và lưu
```

### Expected persisted records

```text
CASH_SALE: 12,960 cents
PRIVATE_WITHDRAWAL: 12,960 cents
Counted cash: 0 cents
Customer count: 4
```

### Expected HTML Kassenbericht preview

| Field                              | Expected |
| ---------------------------------- | -------: |
| Kassenbestand bei Geschäftsschluss |   0,00 € |
| Wareneinkäufe                      |   0,00 € |
| Geschäftsausgaben                  |   0,00 € |
| Privatentnahmen                    | 129,60 € |
| Sonstige Ausgaben/Bankeinzahlungen |   0,00 € |
| Summe                              | 129,60 € |
| Kassenendbestand des Vortages      |   0,00 € |
| Sonstige Einnahmen                 |   0,00 € |
| Bareinnahmen/Tageslosung           | 129,60 € |
| Kundenzahl                         |        4 |

Expected explanation:

```text
0,00 € tiền còn cuối ngày
+ 129,60 € lấy ra dùng cá nhân
- 0,00 € tiền cuối ngày hôm trước
= 129,60 € doanh thu tiền mặt
```

### Expected status

Depending on the configured evidence policy:

```text
READY_TO_CLOSE
```

or:

```text
READY_TO_CLOSE with missing Eigenbeleg warning
```

If missing Eigenbeleg is configured as blocking, expect:

```text
NEEDS_REVIEW
```

Confirm the intended policy before judging this status.

### Important

The day must not close automatically.

---

# Scenario 5: Money remains in the drawer

Reset the test date before starting.

### User message

```text
Hôm nay khách trả tiền mặt 129,60 €.
Sáng trong quỹ là 0 €.
Em không lấy tiền ra.
Cuối ngày em đếm trong ngăn kéo còn 129,60 €.
```

### Expected confirmation

```text
Cash sales: 129,60 €
Private withdrawal: 0,00 €
Actual closing cash: 129,60 €
Previous closing cash: 0,00 €
```

### Confirm and save

Expected records:

```text
CASH_SALE: 12,960 cents
No PRIVATE_WITHDRAWAL entry
Counted cash: 12,960 cents
```

### Expected preview

| Field                              | Expected |
| ---------------------------------- | -------: |
| Kassenbestand bei Geschäftsschluss | 129,60 € |
| Privatentnahmen                    |   0,00 € |
| Kassenendbestand des Vortages      |   0,00 € |
| Bareinnahmen/Tageslosung           | 129,60 € |

### Pass criteria

Corely must not create a private withdrawal merely because the cash register has a “withdraw” operation.

---

# Scenario 6: Private deposit for change

Reset the test date.

### User message

```text
Hôm nay là ngày đầu mở tiệm.
Sáng em bỏ 30 € tiền cá nhân vào quỹ để thối cho khách.
Khách trả tiền mặt tổng cộng 100 €.
Không có chi phí gì.
Cuối ngày trong quỹ còn 130 €.
```

### Expected classification

```text
PRIVATE_DEPOSIT: 30,00 €
CASH_SALE: 100,00 €
Actual closing cash: 130,00 €
```

### Expected confirmation card

```text
Privateinlage: 30,00 €
Bareinnahmen: 100,00 €
Tiền cuối ngày: 130,00 €
```

### Expected preview

| Field                              | Expected |
| ---------------------------------- | -------: |
| Kassenbestand bei Geschäftsschluss | 130,00 € |
| Privatentnahmen                    |   0,00 € |
| Sonstige Einnahmen/Privateinlage   |  30,00 € |
| Kassenendbestand des Vortages      |   0,00 € |
| Bareinnahmen/Tageslosung           | 100,00 € |

Expected calculation:

```text
130,00 €
- 0,00 € tiền cuối ngày hôm trước
- 30,00 € Privateinlage
= 100,00 € doanh thu tiền mặt
```

### Expected evidence warning

```text
Eigenbeleg required for Privateinlage
```

---

# Scenario 7: Business bank deposit

Reset or prepare the previous day so that it closes with `330,00 €`.

### User message

```text
Cuối ngày hôm qua trong quỹ có 330 €.
Hôm nay doanh thu tiền mặt là 100 €.
Cuối ngày em mang 400 € nộp vào tài khoản ngân hàng của tiệm.
Sau khi nộp, trong quỹ còn 30 €.
```

### Expected classification

```text
Previous closing cash: 330,00 €
Cash sales: 100,00 €
Bank deposit: 400,00 €
Private withdrawal: 0,00 €
Actual closing cash: 30,00 €
```

### Expected preview

| Field                              | Expected |
| ---------------------------------- | -------: |
| Kassenbestand bei Geschäftsschluss |  30,00 € |
| Privatentnahmen                    |   0,00 € |
| Sonstige Ausgaben/Bankeinzahlungen | 400,00 € |
| Summe                              | 430,00 € |
| Kassenendbestand des Vortages      | 330,00 € |
| Bareinnahmen/Tageslosung           | 100,00 € |

Expected calculation:

```text
30,00 €
+ 400,00 € Bankeinzahlung
- 330,00 € tiền cuối ngày hôm trước
= 100,00 € doanh thu tiền mặt
```

### Expected warning

```text
Bank deposit slip required
```

### Critical pass criterion

The 400 € must be classified as:

```text
BANK_DEPOSIT
```

not:

```text
PRIVATE_WITHDRAWAL
```

---

# Scenario 8: Balance mismatch must block closing

Reset the date.

### User input

```text
Tiền cuối ngày hôm trước là 30 €.
Hôm nay doanh thu tiền mặt là 100 €.
Em lấy 50 € về dùng cá nhân.
Nhưng em đếm cuối ngày trong quỹ còn 0 €.
```

### Expected calculation

The expected physical closing cash is:

```text
30 + 100 - 50 = 80 €
```

But the user entered:

```text
0 €
```

### Expected assistant behaviour

The assistant should say something like:

```text
Corely tính rằng cuối ngày phải còn 80,00 €, nhưng em nhập 0,00 €.

Có thể còn một khoản rút 80,00 € chưa được ghi hoặc số tiền đếm cuối ngày chưa đúng.
```

### Expected preview status

```text
NEEDS_REVIEW
```

### Expected warning

```text
BALANCE_MISMATCH
```

Expected difference:

```text
80,00 €
```

### UI verification

- Warning is clearly visible.
- Close button is disabled.
- Printing may remain available as a draft, but it must be visibly marked as draft/review required.
- The day cannot be closed through a direct API request either.

---

# Scenario 9: Explicitly close a valid day

Use the valid record from Scenario 4, 5, 6 or 7.

### Initial state

The preview should show:

```text
READY_TO_CLOSE
```

The database day status should still be open.

### Click

```text
Xác nhận và chốt ngày
```

### Expected behaviour

The application should:

1. Check the current cash status.
2. Validate that there are no blocking warnings.
3. Close the cash day.
4. Reload the preview.

### Expected result

```text
Status: CLOSED / ABGESCHLOSSEN
```

Verify:

- Closed timestamp is stored.
- Preview becomes read-only.
- Print remains available.
- Editing is no longer silently allowed.
- Refreshing the browser keeps the day closed.

### Must not happen

The day must not close merely because the user clicked **Xác nhận và lưu** in the earlier step.

Saving and closing are two separate confirmations.

---

# Scenario 10: Monthly report preview

Prepare several closed days in July 2026.

Example:

| Date  | Cash sales |                     Closing cash |
| ----- | ---------: | -------------------------------: |
| 22.07 |   100,00 € |                         130,00 € |
| 23.07 |   100,00 € |                         230,00 € |
| 24.07 |   100,00 € |                         330,00 € |
| 25.07 |   100,00 € | 30,00 € after 400 € bank deposit |

### User message

```text
Hiển thị Kassenabrechnung tháng 07.2026.
```

### Expected behaviour

- Corely calls the monthly read-only report tool.
- No financial records are created or modified.
- `MonthlyCashReportPreview` appears.

### Expected monthly totals

```text
Cash sales: 400,00 €
Bank deposits: 400,00 €
Opening cash: 0,00 €
Final closing cash: 30,00 €
```

Also verify:

- Missing-day status
- Continuity warnings
- Draft and closed-day counts
- Monthly status
- Correct Vietnamese explanations

---

## Manual pass/fail checklist

For each scenario, record:

| Check                                   | Pass/Fail |
| --------------------------------------- | --------- |
| Correct assistant intent                |           |
| Correct clarification question          |           |
| No writes before confirmation           |           |
| Confirmation summary matches user input |           |
| Correct tool sequence                   |           |
| Correct persisted movements             |           |
| Correct integer-cent values             |           |
| Correct HTML preview                    |           |
| Correct warnings                        |           |
| Correct status                          |           |
| Print layout works                      |           |
| Day not closed automatically            |           |
| Tenant/location are correct             |           |
| Browser refresh preserves state         |           |

The best first manual run is:

1. General question
2. Ambiguous withdrawal
3. Full private withdrawal
4. Cash remains in drawer
5. Private deposit
6. Bank deposit
7. Balance mismatch
8. Explicit closing
9. Monthly preview
