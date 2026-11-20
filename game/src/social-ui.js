// Chat, profil pemain, panel teman, undangan, blokir, dan laporan di arena.
import { PRESETS, checkText } from "../../shared/chat.js";

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
};

export class SocialUI {
  // opts: { profile, getRoom, toast, onBubble(sessionId, text), currentTable(), joinInvite(game, code) }
  constructor(opts) {
    Object.assign(this, opts);
    this.setting = opts.profile.role === "ortu" ? "bebas" : (opts.profile.chat || "mati");
    if (opts.profile.jenjang === "SD" && this.setting === "bebas") this.setting = "siap";
    this.log = [];
    this.profileSid = null;
    this.data = { friends: [], incoming: [], waiting: [] };

    $("social-btns").hidden = false;
    document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => ($(b.dataset.close).hidden = true)));
    $("btn-chat").onclick = () => this.toggle("chat-panel");
    $("btn-teman").onclick = () => { this.toggle("teman-panel"); this.refreshFriends(); };
    this.setupChat();
    this.setupProfile();
  }

  toggle(id) {
    const p = $(id);
    p.hidden = !p.hidden;
    if (id === "chat-panel" && !p.hidden) $("chat-log").scrollTop = 1e6;
  }

  room() {
    return this.getRoom();
  }

  // Dipanggil setiap kali tersambung ke ruang arena.
  attach(room) {
    room.onMessage("chat-masuk", (m) => this.onChat(m, room));
    room.onMessage("chat-ditolak", (t) => this.chatError(t));
    room.onMessage("info", (t) => this.toast(t));
    room.onMessage("profil", (p) => this.showProfile(p));
    room.onMessage("diblokir", () => { $("profil").hidden = true; });
    room.onMessage("teman-daftar", (d) => { this.data = d; this.renderFriends(); });
    room.onMessage("teman-permintaan", (r) => {
      this.notice(`${r.name} ingin berteman denganmu.`, [
        ["Terima", "primary", () => this.answer(r.id, true)],
        ["Tolak", "", () => this.answer(r.id, false)],
      ]);
      this.refreshFriends();
    });
    room.onMessage("undangan", (u) => {
      this.notice(`${u.name} mengajakmu main ${u.gameName}!`, [
        ["Gabung", "primary", () => this.joinInvite(u.game, u.code)],
        ["Nanti", "", () => {}],
      ]);
    });
    this.refreshFriends();
  }

  // ---------- chat ----------
  setupChat() {
    const note = $("chat-note");
    if (this.setting === "mati") {
      note.textContent = "Chat dimatikan oleh orang tua.";
      $("btn-chat").hidden = true;
      return;
    }
    note.textContent = this.setting === "siap" ? "Pilih pesan siap pakai:" : "Pilih pesan, atau tulis sendiri dengan sopan:";
    $("chat-presets").replaceChildren(...PRESETS.map((t, i) => {
      const b = document.createElement("button");
      b.textContent = t;
      b.onclick = () => this.send({ preset: i });
      return b;
    }));
    if (this.setting === "bebas") {
      $("chat-form").hidden = false;
      $("chat-input").addEventListener("input", () => this.chatError(""));
      $("chat-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const r = checkText($("chat-input").value);
        if (!r.ok) return this.chatError(r.reason);
        this.send({ text: r.text });
        $("chat-input").value = "";
      });
    }
  }

  send(msg) {
    const room = this.room();
    if (!room) return this.chatError("Belum tersambung ke server.");
    this.chatError("");
    room.send("chat", msg);
  }

  chatError(t) {
    $("chat-error").textContent = t;
    $("chat-error").hidden = !t;
  }

  onChat(m, room) {
    this.onBubble(m.from, m.text);
    this.log.push(m);
    if (this.log.length > 40) this.log.shift();
    const li = document.createElement("li");
    li.className = m.from === room.sessionId ? "me" : "";
    const b = document.createElement("b");
    b.textContent = m.from === room.sessionId ? "Kamu" : m.name;
    li.append(b, `: ${m.text}`);
    const log = $("chat-log");
    log.appendChild(li);
    while (log.children.length > 40) log.firstChild.remove();
    log.scrollTop = 1e6;
  }

  // ---------- profil pemain lain ----------
  openProfile(sessionId) {
    const room = this.room();
    if (!room || sessionId === room.sessionId) return;
    room.send("profil", { sessionId });
  }

  setupProfile() {
    $("profil-teman").onclick = () => {
      if (this.profileRel === "diminta") return; // dijawab lewat panel teman
      this.room()?.send("teman-minta", { sessionId: this.profileSid });
      $("profil").hidden = true;
    };
    $("profil-blokir").onclick = () => {
      if (!confirm("Blokir pemain ini? Kalian tidak akan melihat chat satu sama lain, dan pertemanan akan putus.")) return;
      this.room()?.send("blokir", { sessionId: this.profileSid });
    };
    $("profil-lapor").onclick = () => {
      this.room()?.send("lapor", { sessionId: this.profileSid, reason: $("profil-alasan").value });
      $("profil").hidden = true;
    };
  }

  showProfile(p) {
    this.profileSid = p.sessionId;
    this.profileRel = p.relation;
    $("profil-nama").textContent = p.name;
    $("profil-info").textContent = p.jenjang + (p.blocked ? " · diblokir" : "");
    const t = $("profil-teman");
    const label = {
      teman: "Sudah berteman ✓", menunggu: "Permintaan menunggu", diminta: "Dia ingin berteman: buka panel Teman",
      none: "Tambah teman",
    }[p.relation];
    t.textContent = label;
    t.hidden = !p.canFriend || p.blocked;
    t.disabled = p.relation === "teman" || p.relation === "menunggu";
    $("profil-blokir").hidden = p.blocked;
    $("profil").hidden = false;
  }

  // ---------- teman ----------
  refreshFriends() {
    this.room()?.send("teman-daftar");
  }

  answer(id, terima) {
    this.room()?.send("teman-jawab", { id, terima });
    setTimeout(() => this.refreshFriends(), 400);
  }

  renderFriends() {
    const d = this.data;
    const box = $("teman-isi");
    const badge = $("teman-badge");
    badge.textContent = d.incoming.length;
    badge.hidden = !d.incoming.length;
    if (d.onlyKids) {
      box.replaceChildren(el("p", { className: "muted small", textContent: "Pertemanan hanya untuk akun anak." }));
      return;
    }
    const rows = [];
    const table = this.currentTable();
    for (const r of d.incoming) {
      rows.push(this.row(`${r.name} (${r.jenjang}) ingin berteman`, [
        ["Terima", "primary", () => this.answer(r.id, true)],
        ["Tolak", "", () => this.answer(r.id, false)],
      ]));
    }
    for (const f of d.friends) {
      const status = el("span", { className: f.online ? "on" : "muted", textContent: f.online ? " ● di arena" : " ○" });
      const r = this.row(`${f.name} (${f.jenjang})`, f.online && table ? [
        ["Undang ke mejaku", "primary", () => this.room()?.send("undang", { uid: f.uid, game: table.game, code: table.code })],
      ] : []);
      r.firstChild.appendChild(status);
      rows.push(r);
    }
    for (const w of d.waiting) rows.push(this.row(`${w.name}: ${w.step}`, []));
    if (!rows.length) rows.push(el("p", { className: "muted small", textContent: "Belum ada teman." }));
    if (d.friends.some((f) => f.online) && !table) {
      rows.push(el("p", { className: "muted small", textContent: "Tip: buat meja dengan kode, lalu buka panel ini untuk mengundang teman." }));
    }
    box.replaceChildren(...rows);
  }

  row(text, buttons) {
    const r = el("div", { className: "friend-row" }, el("span", { textContent: text }));
    const btns = el("span", { className: "row" });
    for (const [label, cls, fn] of buttons) {
      const b = el("button", { textContent: label, className: cls });
      b.onclick = fn;
      btns.appendChild(b);
    }
    r.appendChild(btns);
    return r;
  }

  // ---------- pemberitahuan ----------
  notice(text, buttons) {
    $("notice-text").textContent = text;
    $("notice-btns").replaceChildren(...buttons.map(([label, cls, fn]) => {
      const b = el("button", { textContent: label, className: cls });
      b.onclick = () => { $("notice").hidden = true; fn(); };
      return b;
    }));
    $("notice").hidden = false;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => ($("notice").hidden = true), 20000);
  }
}
