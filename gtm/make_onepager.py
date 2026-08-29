"""One-page MIP / Agent Starter offer PDF for James Networks."""
from pathlib import Path

from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

OUT = Path(__file__).resolve().parent / "James-Networks-Agent-Starter-OnePager.pdf"

BG = HexColor("#07090d")
TEAL = HexColor("#2ec4b6")
GOLD = HexColor("#f2c14e")
TEXT = HexColor("#f4efe6")
MUTED = HexColor("#9a9082")
CARD = HexColor("#12161c")
BORDER = HexColor("#3a3428")


def draw_round_rect(c, x, y, w, h, r=10):
    c.roundRect(x, y, w, h, r, stroke=1, fill=1)


def main():
    c = canvas.Canvas(str(OUT), pagesize=letter)
    W, H = letter

    # Background
    c.setFillColor(BG)
    c.rect(0, 0, W, H, stroke=0, fill=1)

    # Accent orbs (subtle)
    c.setFillColor(Color(0.18, 0.77, 0.71, alpha=0.08))
    c.circle(W - 40, H - 40, 120, stroke=0, fill=1)
    c.setFillColor(Color(0.95, 0.76, 0.31, alpha=0.06))
    c.circle(60, 80, 100, stroke=0, fill=1)

    margin = 0.65 * inch
    y = H - margin

    # Header
    c.setFillColor(TEAL)
    c.setFont("Helvetica", 9)
    c.drawString(margin, y, "JAMES NETWORKS  ·  CLINTON, MISSOURI")
    y -= 22
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(margin, y, "Agents as a Service")
    y -= 16
    c.setFillColor(GOLD)
    c.setFont("Helvetica", 11)
    c.drawString(margin, y, "Managed Intelligence Provider  ·  one painful routine, done with you")
    y -= 28

    # Hero line
    c.setFillColor(TEXT)
    c.setFont("Helvetica", 11)
    for line in [
        "Always-on teammates that finish work in the tools you already use —",
        "inbox, quotes, reviews, ops. Local partner. Real IT. No demo theater.",
    ]:
        c.drawString(margin, y, line)
        y -= 14

    y -= 10
    # Starter card
    c.setFillColor(CARD)
    c.setStrokeColor(TEAL)
    c.setLineWidth(1.2)
    draw_round_rect(c, margin, y - 145, W - 2 * margin, 145, 12)

    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin + 16, y - 22, "START HERE")
    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin + 16, y - 42, "Agent Starter")
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin + 16, y - 60, "from $1,500 setup  +  $300–600 / month")

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    bullets = [
        "1–2 named agents (Grok Bot under the hood)",
        "One taught routine each — you show it once",
        "Tool login setup + 2-week shadow",
        "Money / access stay human-gated",
        "You bring eligible seats (or we help provision)",
    ]
    by = y - 78
    for b in bullets:
        c.setFillColor(TEAL)
        c.circle(margin + 22, by + 3, 2.2, stroke=0, fill=1)
        c.setFillColor(TEXT)
        c.drawString(margin + 32, by, b)
        by -= 13

    y -= 165

    # Two columns: method + catalog
    col_w = (W - 2 * margin - 12) / 2
    c.setFillColor(CARD)
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.8)
    draw_round_rect(c, margin, y - 118, col_w, 118, 10)
    draw_round_rect(c, margin + col_w + 12, y - 118, col_w, 118, 10)

    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin + 14, y - 20, "HOW IT WORKS")
    c.setFillColor(TEXT)
    c.setFont("Helvetica", 9)
    steps = [
        "1  Assess — map the real chore",
        "2  Deploy — teach the agent once",
        "3  Guardrails — humans keep the keys",
        "4  Operate — monthly watch & tune",
    ]
    sy = y - 38
    for s in steps:
        c.drawString(margin + 14, sy, s)
        sy -= 14

    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin + col_w + 26, y - 20, "COMMON FIRST ROUTINES")
    c.setFillColor(TEXT)
    c.setFont("Helvetica", 9)
    cats = [
        "Inbox & follow-up",
        "Quote / lead chase",
        "Review & reputation",
        "Vendor / invoice ops",
        "Service desk assist",
    ]
    sy = y - 38
    for s in cats:
        c.setFillColor(TEAL)
        c.drawString(margin + col_w + 26, sy, "•")
        c.setFillColor(TEXT)
        c.drawString(margin + col_w + 36, sy, s)
        sy -= 14

    y -= 138

    # Team teaser
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(
        margin,
        y,
        "Ready for more? Agent Team — 3–6 bots + weekly digest · from $5,000 setup + $1,200–3,500/mo",
    )
    y -= 22

    # CTA box
    c.setFillColor(CARD)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.2)
    draw_round_rect(c, margin, y - 88, W - 2 * margin, 88, 12)

    c.setFillColor(TEXT)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(margin + 16, y - 28, "Next step: free 30-minute fit call")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    c.drawString(margin + 16, y - 46, "Tell me the weekly chore you hate. I’ll tell you if an agent can own it.")
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(margin + 16, y - 68, "calendly.com/bigdaddydj/30min")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawRightString(W - margin - 16, y - 68, "david.james@jamesnetworks.net")

    # Footer
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(margin, 0.45 * inch, "www.jamesnetworks.net  ·  MIP — Agents as a Service  ·  Prices are list guidance; final quote follows scope.")
    c.drawRightString(W - margin, 0.45 * inch, "© James Networks")

    c.save()
    print(OUT)


if __name__ == "__main__":
    main()
