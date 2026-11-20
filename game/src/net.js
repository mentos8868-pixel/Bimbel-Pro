// Koneksi ke server multiplayer (Colyseus).
// Setiap kali bergabung ke ruang, game mengambil "tiket" baru dari API akun sebagai bukti sudah masuk.
import { Client } from "colyseus.js";
import { api } from "./api.js";

const proto = location.protocol === "https:" ? "wss" : "ws";
const url = import.meta.env.VITE_SERVER_URL || `${proto}://${location.hostname}:2567`;

export const client = new Client(url);

let playingAs = null; // "anak" | "ortu" | null (tamu: tidak bisa online)
export function setPlayingAs(as) {
  playingAs = as;
}
export const canGoOnline = () => !!playingAs;

async function ticket() {
  if (!playingAs) throw new Error("Masuk dengan akun untuk bermain online.");
  return (await api("GET", `tiket?sebagai=${playingAs}`)).ticket;
}

export async function joinArena() {
  return client.joinOrCreate("arena", { ticket: await ticket() });
}

// ----- Catur -----
export async function findChessMatch(profile) {
  return client.joinOrCreate("chess", { ticket: await ticket(), jenjang: profile.jenjang });
}
export async function createChessTable() {
  return client.create("chess", { ticket: await ticket(), private: true });
}
export async function joinChessTable(code) {
  return client.joinById(code.trim().toUpperCase(), { ticket: await ticket() });
}

// ----- Scramble: lawan acak hanya yang sejenjang dan sebahasa -----
export async function findScrambleMatch(profile, lang) {
  return client.joinOrCreate("scramble", { ticket: await ticket(), jenjang: profile.jenjang, lang });
}
export async function createScrambleTable(profile, lang) {
  return client.create("scramble", { ticket: await ticket(), jenjang: profile.gameJenjang, lang, private: true });
}
export async function joinScrambleTable(code) {
  return client.joinById(code.trim().toUpperCase(), { ticket: await ticket() });
}

// ----- Kartu Kilat: lawan acak hanya yang sejenjang dan sejenis kartu -----
export async function findKartuMatch(profile, mode) {
  return client.joinOrCreate("kartu", { ticket: await ticket(), jenjang: profile.jenjang, mode });
}
export async function createKartuTable(profile, mode) {
  return client.create("kartu", { ticket: await ticket(), jenjang: profile.gameJenjang, mode, private: true });
}
export async function joinKartuTable(code) {
  return client.joinById(code.trim().toUpperCase(), { ticket: await ticket() });
}
