// Pemilih avatar: deretan jenis (Ulat, Robo, ...) lalu satu keluarga berisi 4 anggota.
import { FAMILIES, MEMBERS, DINO_FAMILY, DINO_AVATAR, parseAvatar, avatarOr } from "../../shared/avatars.js";
import { avatarSvg } from "./avatar-svg.js";

// wrap: elemen kosong. Mengembalikan { get, set, setAccent }.
export function avatarPicker(wrap, { value, accent = "#4f9cf0", onPick = () => {} } = {}) {
  let current = avatarOr(value);
  let family = parseAvatar(current).family.id;
  wrap.classList.add("avatar-picker");

  const tabs = document.createElement("div");
  tabs.className = "av-tabs";
  tabs.setAttribute("role", "tablist");
  const grid = document.createElement("div");
  grid.className = "av-family";
  wrap.replaceChildren(tabs, grid);

  function render() {
    tabs.replaceChildren(...[...FAMILIES, DINO_FAMILY].map((f) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "av-tab" + (f.id === family ? " on" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", f.id === family);
      b.innerHTML = avatarSvg(f === DINO_FAMILY ? DINO_AVATAR : `${f.id}-putra`, accent);
      const t = document.createElement("span");
      t.textContent = f.name;
      b.append(t);
      b.onclick = () => { family = f.id; render(); };
      return b;
    }));
    const members = family === DINO_FAMILY.id ? [parseAvatar(DINO_AVATAR).member] : MEMBERS;
    grid.replaceChildren(...members.map((m) => {
      const id = `${family}-${m.id}`;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "av-member" + (id === current ? " on" : "");
      b.setAttribute("aria-pressed", id === current);
      b.innerHTML = avatarSvg(id, accent, { sized: true });
      const t = document.createElement("span");
      t.textContent = id === DINO_AVATAR ? DINO_FAMILY.name : m.name;
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
  };
}
