(() => {
  const list = document.getElementById("comment-list");
  const form = document.getElementById("comment-form");
  const status = document.getElementById("comment-status");
  const submit = document.getElementById("comment-submit");
  if (!list || !form) return;

  const api = "/api/msp-stories-comment";

  function setStatus(msg, kind) {
    if (!status) return;
    status.textContent = msg || "";
    status.className = "form-status" + (kind ? " " + kind : "");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatWhen(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function render(comments) {
    list.innerHTML = (comments || [])
      .map(
        (c) => `<li class="comment">
        <header>
          <span>${escapeHtml(c.name || "Anonymous")}</span>
          ${c.receivedAt ? `<time datetime="${escapeHtml(c.receivedAt)}">${escapeHtml(formatWhen(c.receivedAt))}</time>` : ""}
        </header>
        <p>${escapeHtml(c.body || "")}</p>
      </li>`
      )
      .join("");
  }

  async function load() {
    try {
      const res = await fetch(api, { headers: { accept: "application/json" } });
      const data = await res.json();
      render(data.comments || []);
    } catch {
      /* empty list is fine */
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    const payload = {
      name: (form.name.value || "").trim(),
      email: (form.email.value || "").trim(),
      body: (form.body.value || "").trim(),
      website_url: (form.website_url.value || "").trim(),
    };
    if (submit) submit.disabled = true;
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.error || "Couldn't send that. Try again.", "err");
        return;
      }
      setStatus(data.message || "Thanks — David got your note.", "ok");
      form.reset();
      if (data.stored) load();
      else if (data.comment) {
        const existing = list.innerHTML;
        render([data.comment]);
        list.innerHTML += existing;
      }
    } catch {
      setStatus(
        "Couldn't send that from here. Email david.james@jamesnetworks.net.",
        "err"
      );
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  load();
})();
