/* FlowScout middleware capability matrix.
   Versioned content, not code — update facts here (pricing, connectors,
   positioning) without touching app logic. Last reviewed: 2026-07. */
const FLOWSCOUT_PLATFORMS = [
  {
    id: "zapier",
    name: "Zapier",
    tagline: "The easiest on-ramp, with the biggest connector library",
    skill: "No technical skill needed",
    pricing: "Per-task pricing — friendly at low volume, expensive at high volume",
    costBands: { low: "$0–30/mo", mid: "$30–75/mo", high: "$75–300+/mo" },
    connectors: "7,000+ app integrations",
    vocab: { trigger: "Trigger", step: "Action step", branch: "Paths / Filter", code: "Code step", approval: "Human-in-the-loop (Interfaces / email approval)" },
    notes: "Best when nobody on the team wants to touch anything technical and run volume is modest. Watch the task count — costs climb fast as volume grows."
  },
  {
    id: "make",
    name: "Make",
    tagline: "Visual scenario builder with strong branching, cheaper at volume than Zapier",
    skill: "Comfortable with flowcharts and a little configuration",
    pricing: "Per-operation pricing — meaningfully cheaper than Zapier at moderate volume",
    costBands: { low: "$0–20/mo", mid: "$20–60/mo", high: "$60–200/mo" },
    connectors: "2,000+ app integrations",
    vocab: { trigger: "Trigger module", step: "Module", branch: "Router", code: "Custom function / HTTP module", approval: "Pause + approval webhook" },
    notes: "The middle path: real branching logic and a visual canvas without needing a developer. Good fit when Zapier's pricing stings but self-hosting is too much."
  },
  {
    id: "n8n",
    name: "n8n",
    tagline: "Developer-friendly, self-hostable, flat-cost at scale",
    skill: "Someone comfortable with JSON, APIs, or light scripting",
    pricing: "Self-hosted (server cost only) or cloud tiers — cost barely moves with volume",
    costBands: { low: "$0–24/mo", mid: "$24–60/mo", high: "$60/mo or self-host flat" },
    connectors: "500+ nodes plus generic HTTP/webhook nodes for anything else",
    vocab: { trigger: "Trigger node (Webhook / Schedule / IMAP)", step: "Node", branch: "IF / Switch node", code: "Code node", approval: "Wait node + approval webhook" },
    notes: "Wins on high volume, data control, and AI-agent workflows. Self-hosting keeps sensitive data on your own hardware. Needs at least one person who won't panic at a JSON payload."
  },
  {
    id: "rewst",
    name: "Rewst",
    tagline: "Automation built specifically for MSPs",
    skill: "MSP technician comfortable with PSA/RMM tooling",
    pricing: "MSP subscription (contact pricing) — includes ROC prebuilt automation crates",
    costBands: { low: "subscription", mid: "subscription", high: "subscription" },
    connectors: "Deep PSA/RMM hooks: ConnectWise, Datto, Halo, Kaseya, Microsoft CSP, and more",
    vocab: { trigger: "Trigger (PSA/RMM event or webhook)", step: "Task / Action", branch: "Conditional", code: "Jinja templating", approval: "Form / approval task" },
    notes: "If you're an MSP living in a PSA and RMM, Rewst speaks your language out of the box — prebuilt crates cover common MSP workflows like onboarding and ticket enrichment. Not aimed at general small business."
  },
  {
    id: "power-automate",
    name: "Power Automate",
    tagline: "The default answer inside a Microsoft 365 shop",
    skill: "Comfortable with Microsoft 365 admin basics",
    pricing: "Bundled with many M365 licenses; premium connectors cost extra per user",
    costBands: { low: "$0 (bundled)", mid: "$15/user/mo premium", high: "$15/user/mo + capacity" },
    connectors: "1,000+ connectors, unbeatable Outlook / Teams / SharePoint / Excel depth",
    vocab: { trigger: "Trigger (When an email arrives / When a form is submitted)", step: "Action", branch: "Condition / Switch", code: "Office Script / Azure Function", approval: "Approvals action (Teams/Outlook)" },
    notes: "If the whole stack is Outlook, Teams, SharePoint, and Excel, this is already paid for and already inside the tenant. Less pleasant once you leave the Microsoft ecosystem."
  }
];
