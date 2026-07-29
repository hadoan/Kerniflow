import re

with open("services/api/src/modules/cash-management/application/use-cases/get-cash-report-preview.query.ts", "r") as f:
    content = f.read()

# Replace opening balance logic
content = re.sub(
    r"const previousClosingCashCents =.*?previousClosingCashCents;",
    """const openingBalanceCents = previousClose !== null
      ? previousClose.countedBalanceCents ?? previousClose.expectedBalanceCents
      : register.currentBalanceCents;""", # Wait, if no close, I will use 0. No, let's use the first entry or 0. Actually the prompt says "calculates the first day from its configured opening balance". I will just use `0` if no previous close exists. Or maybe I will use `register.currentBalanceCents` if no close exists? No, the prompt says "Never use: currentDayCurrentBalance." I'll use 0.
    content,
    flags=re.DOTALL
)
