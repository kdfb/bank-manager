"""
Bank Manager Simulator
Run with: python main.py
"""

import random
import sys

# ── Constants ──────────────────────────────────────────────────────────────────
STARTING_CASH       = 500_000
STARTING_DEPOSITS   = 300_000   # what customers already have on deposit
STARTING_REPUTATION = 60        # out of 100
DAILY_OVERHEAD      = 2_000     # staff, utilities, etc.
WIN_DAY             = 30
WIN_ASSETS          = 800_000
WIN_REPUTATION      = 55
LOSE_CASH           = 0
LOSE_REPUTATION     = 15

# ── Colours (works on most terminals) ─────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def c(colour, text): return f"{colour}{text}{RESET}"

# ── Bank state ─────────────────────────────────────────────────────────────────
bank = {
    "cash":        STARTING_CASH,
    "deposits":    STARTING_DEPOSITS,   # money customers deposited (liability)
    "loans_out":   0,                   # total loans we issued (asset)
    "loan_book":   [],                  # list of active loan dicts
    "reputation":  STARTING_REPUTATION,
    "day":         1,
    "profit":      0,
}

def assets():      return bank["cash"] + bank["loans_out"]
def net_worth():   return assets() - bank["deposits"]

# ── Helpers ────────────────────────────────────────────────────────────────────
def fmt(n): return f"${n:,.0f}"

def status_bar():
    rep = bank["reputation"]
    rep_colour = GREEN if rep >= 55 else (YELLOW if rep >= 30 else RED)
    print()
    print(c(BOLD, f"═══ Day {bank['day']}/{WIN_DAY} ════════════════════════════════════"))
    print(f"  Cash reserves : {c(GREEN, fmt(bank['cash']))}")
    print(f"  Loans out     : {c(CYAN,  fmt(bank['loans_out']))}")
    print(f"  Total assets  : {c(CYAN,  fmt(assets()))}")
    print(f"  Deposits owed : {c(YELLOW, fmt(bank['deposits']))}")
    print(f"  Net worth     : {fmt(net_worth())}")
    print(f"  Reputation    : {c(rep_colour, str(rep))}/100")
    print(f"  Cumul. profit : {fmt(bank['profit'])}")
    print()

def ask(prompt, valid):
    while True:
        raw = input(prompt).strip().lower()
        if raw in valid:
            return raw
        print(f"  Please enter one of: {', '.join(valid)}")

def pause():
    input(c(CYAN, "  [Press Enter to continue] "))

# ── Loan helpers ───────────────────────────────────────────────────────────────
def collect_loan_payments():
    """Called each day. Collects monthly payments on due loans."""
    income = 0
    still_active = []
    for loan in bank["loan_book"]:
        loan["days_left"] -= 1
        # Simple interest: borrower pays principal/term + interest each day
        daily_payment = loan["daily_payment"]
        if bank["cash"] >= 0:  # borrower pays us
            bank["cash"]      += daily_payment
            bank["loans_out"] -= loan["principal"] / loan["term_days"]
            bank["profit"]    += daily_payment - (loan["principal"] / loan["term_days"])
            income            += daily_payment
        if loan["days_left"] > 0:
            still_active.append(loan)
    bank["loan_book"] = still_active
    return income

def apply_deposit_interest():
    """We pay depositors 2% annual ≈ 0.0055% per day."""
    interest = bank["deposits"] * 0.000055
    bank["cash"]   -= interest
    bank["profit"] -= interest
    return interest

# ── Events ─────────────────────────────────────────────────────────────────────

def event_loan_application():
    names   = ["Alice Mwangi", "Bob Okonkwo", "Carmen Reyes", "David Patel",
               "Elena Ivanova", "Frank Johansson", "Grace Liu", "Hiro Tanaka"]
    purposes = ["a new business", "a home renovation", "a car purchase",
                "an education fund", "a medical emergency", "farm equipment"]
    name    = random.choice(names)
    purpose = random.choice(purposes)
    amount  = random.randint(5, 80) * 1_000
    risk    = random.choice(["low", "medium", "high"])
    term_months = random.choice([6, 12, 24, 36])
    term_days   = term_months * 30

    # Interest rate based on risk
    rate_map = {"low": 0.06, "medium": 0.12, "high": 0.20}
    annual_rate = rate_map[risk]
    total_interest = amount * annual_rate * (term_months / 12)
    daily_payment  = (amount + total_interest) / term_days

    print(c(BOLD, "\n  LOAN APPLICATION"))
    print(f"  Applicant : {name}")
    print(f"  Purpose   : {purpose}")
    print(f"  Amount    : {fmt(amount)}")
    print(f"  Risk level: {c(YELLOW if risk=='medium' else (RED if risk=='high' else GREEN), risk.upper())}")
    print(f"  Term      : {term_months} months")
    print(f"  Rate      : {annual_rate*100:.0f}% annual  →  total interest {fmt(total_interest)}")
    print(f"  Daily pay : {fmt(daily_payment)}  (income to you)")

    if bank["cash"] < amount:
        print(c(RED, "  [!] Not enough cash to fund this loan."))
        return

    choice = ask("  Approve loan? (y/n): ", ["y", "n"])
    if choice == "y":
        bank["cash"]      -= amount
        bank["loans_out"] += amount
        bank["loan_book"].append({
            "principal":     amount,
            "term_days":     term_days,
            "days_left":     term_days,
            "daily_payment": daily_payment,
        })
        rep_change = 2 if risk == "low" else 1
        bank["reputation"] = min(100, bank["reputation"] + rep_change)
        print(c(GREEN, f"  Loan approved! Reputation +{rep_change}"))
    else:
        if risk == "low":
            bank["reputation"] = max(0, bank["reputation"] - 2)
            print(c(YELLOW, "  Loan denied. Low-risk applicant turned away. Reputation -2"))
        else:
            print(c(GREEN, "  Loan denied. Risky applicant turned away."))


def event_large_deposit():
    depositor = random.choice(["Sunrise Corp", "Green Valley Farm", "City Pension Fund",
                                "Dr. Nour Al-Rashid", "The Goldstein Family Trust"])
    amount = random.randint(20, 150) * 1_000
    print(c(BOLD, "\n  NEW DEPOSIT OFFER"))
    print(f"  {depositor} wants to deposit {fmt(amount)}.")
    print(f"  This increases your cash but also your liability (you must repay it).")
    choice = ask("  Accept deposit? (y/n): ", ["y", "n"])
    if choice == "y":
        bank["cash"]     += amount
        bank["deposits"] += amount
        bank["reputation"] = min(100, bank["reputation"] + 1)
        print(c(GREEN, f"  Deposit accepted. Cash +{fmt(amount)}, Reputation +1"))
    else:
        print("  Deposit declined.")


def event_withdrawal_request():
    amount = random.randint(5, 40) * 1_000
    print(c(BOLD, "\n  WITHDRAWAL REQUEST"))
    print(f"  A customer wants to withdraw {fmt(amount)}.")
    if bank["cash"] < amount:
        bank["reputation"] = max(0, bank["reputation"] - 10)
        print(c(RED, f"  [!] Insufficient cash! Customer furious. Reputation -10"))
    else:
        bank["cash"]     -= amount
        bank["deposits"] = max(0, bank["deposits"] - amount)
        print(c(GREEN, f"  Withdrawal processed. Cash -{fmt(amount)}"))


def event_random():
    events = [
        {
            "title": "AUDIT PASSED",
            "desc":  "Regulators gave your books a clean bill of health.",
            "effect": lambda: bank.update({"reputation": min(100, bank["reputation"] + 5)}),
            "msg": c(GREEN, "  Reputation +5"),
        },
        {
            "title": "FRAUD ATTEMPT",
            "desc":  "A teller caught a forged cheque. Quick thinking saved the day!",
            "effect": lambda: None,
            "msg": c(GREEN, "  Crisis averted. No loss."),
        },
        {
            "title": "LOCAL NEWS STORY",
            "desc":  "A reporter ran a positive piece on your community lending.",
            "effect": lambda: bank.update({"reputation": min(100, bank["reputation"] + 3)}),
            "msg": c(GREEN, "  Reputation +3"),
        },
        {
            "title": "ECONOMIC DOWNTURN",
            "desc":  "Markets fell. Several borrowers are struggling.",
            "effect": lambda: bank.update({
                "loans_out": max(0, bank["loans_out"] - 15_000),
                "profit": bank["profit"] - 15_000,
            }),
            "msg": c(RED, "  Loan write-down: -$15,000"),
        },
        {
            "title": "ROBBERY ATTEMPT",
            "desc":  "Armed robbers hit the vault. Security held them off but it was costly.",
            "effect": lambda: bank.update({
                "cash":       max(0, bank["cash"] - 8_000),
                "reputation": max(0, bank["reputation"] - 4),
                "profit":     bank["profit"] - 8_000,
            }),
            "msg": c(RED, "  Cash -$8,000. Reputation -4"),
        },
        {
            "title": "INTEREST RATE CUT",
            "desc":  "Central bank cut rates. Your deposit interest costs drop slightly.",
            "effect": lambda: bank.update({"deposits": max(0, bank["deposits"] - 5_000)}),
            "msg": c(GREEN, "  Net deposit liability reduced by $5,000"),
        },
    ]
    e = random.choice(events)
    print(c(BOLD, f"\n  RANDOM EVENT: {e['title']}"))
    print(f"  {e['desc']}")
    e["effect"]()
    print(e["msg"])


def daily_events():
    """Generate 2-4 events for the day."""
    pool = [
        (50, event_loan_application),
        (30, event_large_deposit),
        (40, event_withdrawal_request),
        (25, event_random),
    ]
    shown = set()
    count = random.randint(2, 4)
    for _ in range(count):
        weights = [w for w, _ in pool]
        chosen  = random.choices(pool, weights=weights, k=1)[0]
        fn      = chosen[1]
        if fn.__name__ not in shown:
            shown.add(fn.__name__)
            fn()
            pause()


# ── End-of-day summary ─────────────────────────────────────────────────────────
def end_of_day():
    loan_income = collect_loan_payments()
    dep_interest = apply_deposit_interest()
    bank["cash"]   -= DAILY_OVERHEAD
    bank["profit"] -= DAILY_OVERHEAD

    print(c(BOLD, "\n  END OF DAY SUMMARY"))
    print(f"  Loan repayments received : +{fmt(loan_income)}")
    print(f"  Deposit interest paid    : -{fmt(dep_interest):.2f}")
    print(f"  Daily overhead           : -{fmt(DAILY_OVERHEAD)}")


# ── Win / lose checks ──────────────────────────────────────────────────────────
def check_end():
    if bank["cash"] <= LOSE_CASH:
        print(c(RED, "\n  ══════════════════════════════════"))
        print(c(RED,   "  GAME OVER — Bank is insolvent!"))
        print(c(RED,   "  You ran out of cash reserves."))
        print(c(RED,   "  ══════════════════════════════════\n"))
        return True
    if bank["reputation"] <= LOSE_REPUTATION:
        print(c(RED, "\n  ══════════════════════════════════"))
        print(c(RED,   "  GAME OVER — Bank run triggered!"))
        print(c(RED,   "  Your reputation collapsed. Customers fled."))
        print(c(RED,   "  ══════════════════════════════════\n"))
        return True
    if bank["day"] > WIN_DAY:
        if assets() >= WIN_ASSETS and bank["reputation"] >= WIN_REPUTATION:
            print(c(GREEN, "\n  ══════════════════════════════════"))
            print(c(GREEN,   "  YOU WIN! Excellent management!"))
            print(c(GREEN, f"  Final assets  : {fmt(assets())}"))
            print(c(GREEN, f"  Final rep     : {bank['reputation']}/100"))
            print(c(GREEN, f"  Total profit  : {fmt(bank['profit'])}"))
            print(c(GREEN,   "  ══════════════════════════════════\n"))
        else:
            print(c(YELLOW, "\n  ══════════════════════════════════"))
            print(c(YELLOW,   "  TIME'S UP — Could do better."))
            print(c(YELLOW, f"  Assets needed : {fmt(WIN_ASSETS)}  |  yours: {fmt(assets())}"))
            print(c(YELLOW, f"  Rep needed    : {WIN_REPUTATION}  |  yours: {bank['reputation']}"))
            print(c(YELLOW,   "  ══════════════════════════════════\n"))
        return True
    return False


# ── Title screen ───────────────────────────────────────────────────────────────
def title_screen():
    print(c(BOLD + CYAN, """
  ╔══════════════════════════════════════════╗
  ║       BANK MANAGER SIMULATOR             ║
  ║       Your money. Their trust.           ║
  ╚══════════════════════════════════════════╝
"""))
    print("  GOAL: Survive 30 days, grow assets to $800k, keep reputation above 55.")
    print("  You earn money by issuing loans. You lose money by bad decisions.")
    print()
    print("  HOW TO PLAY:")
    print("  • Each day, customers arrive with requests.")
    print("  • Approve or deny loans, accept or decline deposits.")
    print("  • Watch your cash — if it hits $0, you're bankrupt.")
    print("  • Keep reputation above 15 or customers will pull their money.")
    print()
    ask("  Press Enter to start...", ["", "y", "n", "s"])


# ── Main game loop ─────────────────────────────────────────────────────────────
def main():
    title_screen()
    while True:
        status_bar()
        daily_events()
        end_of_day()
        if check_end():
            break
        bank["day"] += 1

    again = ask("\n  Play again? (y/n): ", ["y", "n"])
    if again == "y":
        # reset state
        bank.update({
            "cash": STARTING_CASH, "deposits": STARTING_DEPOSITS,
            "loans_out": 0, "loan_book": [], "reputation": STARTING_REPUTATION,
            "day": 1, "profit": 0,
        })
        main()


if __name__ == "__main__":
    main()
