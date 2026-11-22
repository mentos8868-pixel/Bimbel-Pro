// Pemilih avatar: deretan jenis (Manusia, Ulat, Robo, ...) lalu satu keluarga berisi 4 anggota.
// Dengan opsi `anggota` (ayah | ibu | putra | putri), anggota keluarga ditentukan otomatis:
// hanya deretan jenis yang tampil, dan memilih jenis langsung memilih "<jenis>-<anggota>".
// Dipakai untuk orang tua (anggota = peran Ayah/Ibu) dan anak (anggota = laki-laki/perempuan).
import { FAMILIES, MEMBERS, parseAvatar, avatarOr, isAvatar } from "../../shared/avatars.js";
import { avatarSvg } from "./avatar-svg.js";

// wrap: elemen kosong. Mengembalikan { get, set, setAccent, setDimiliki, setAnggota }.
export function avatarPicker(wrap, { value, accent = "#4f9cf0", onPick = () => {}, dimiliki = null, anggota = null } = {}) {
  let current = avatarOr(value);
  let family = parseAvatar(current).family.id;
  wrap.classList.add("avatar-picker");

  const tabs = document.createElement("div");
  tabs.className = "av-tabs";
  tabs.setAttribute("role", "tablist");
  const grid = document.createElement("div");
  grid.className = "av-family";
  wrap.replaceChildren(tabs, grid);

  const punya = (id) => isAvatar(id) && (!dimiliki || dimiliki.includes(id));

  function render() {
    const jenis = FAMILIES.filter((f) => (anggota
      ? punya(`${f.id}-${anggota}`)
      : !dimiliki || dimiliki.some((id) => parseAvatar(id)?.family.id === f.id)));
    tabs.replaceChildren(...jenis.map((f) => {
      const id = anggota ? `${f.id}-${anggota}` : null;
      const on = anggota ? id === current : f.id === family;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "av-tab" + (on ? " on" : "");
      b.setAttribute("role", anggota ? "button" : "tab");
      b.setAttribute(anggota ? "aria-pressed" : "aria-selected", on);
      b.innerHTML = avatarSvg(id || `${f.id}-${f.hanyaAnggota || "putra"}`, accent);
      const t = document.createElement("span");
      t.textContent = f.name;
      b.append(t);
      b.onclick = () => {
        family = f.id;
        if (anggota) {
          if (id === current) return;
          current = id;
          render();
          onPick(id);
        } else render();
      };
      return b;
    }));
    // Anggota otomatis: baris anggota (Ayah/Ibu/anak) tidak ditampilkan.
    grid.hidden = !!anggota;
    if (anggota) { grid.replaceChildren(); return; }
    grid.replaceChildren(...MEMBERS.filter((m) => punya(`${family}-${m.id}`)).map((m) => {
      const id = `${family}-${m.id}`;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "av-member" + (id === current ? " on" : "");
      b.setAttribute("aria-pressed", id === current);
      b.innerHTML = avatarSvg(id, accent, { sized: true });
      const t = document.createElement("span");
      t.textContent = m.name;
      b.append(t);
      b.onclick = () => { current = id; render(); onPick(id); };
      return b;
    }));
  }
  render();
  return {
    get: () => current,
    set(v) { current = avatarOr(v); family = parseAvatar(current).family.id; render(); },
    setAccent(c) { accent = c; render(); },
    setDimiliki(ids) { dimiliki = ids; render(); },
    setAnggota(a) { anggota = a; render(); },
  };
}

// Anggota keluarga dari id avatar, mis. "ulat-putri" -> "putri".
export const anggotaDari = (id) => parseAvatar(id)?.member.id || null;
