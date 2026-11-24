import colyseus from "colyseus";
import { Schema, MapSchema, ArraySchema, defineTypes } from "@colyseus/schema";
import { authTable } from "../room-auth.js";
import { JUMLAH_RONDE, MODE_LOMBA, TINGKAT_LOMBA, soalLomba } from "../../shared/lomba-matematika.js";

const { Room, ServerError } = colyseus;

class Pemain extends Schema {}
defineTypes(Pemain, { nama: "string", poin: "number", durasiBenar: "number", siap: "boolean", dijawab: "boolean" });

class Lomba extends Schema {
  constructor() {
    super();
    this.pemain = new MapSchema();
    this.pilihan = new ArraySchema();
  }
}
defineTypes(Lomba, {
  status: "string", ronde: "number", soal: "string", pilihan: ["number"], sisa: "number",
  pemenang: "string", tingkat: "string", mode: "string", host: "string", pemain: { map: Pemain },
});

export class MatematikaRoom extends Room {
  maxClients = 2;

  onCreate({ meja, tingkat, mode } = {}) {
    this.meja = meja;
    const state = new Lomba();
    Object.assign(state, {
      status: "menunggu", ronde: 0, soal: "", sisa: 0, pemenang: "", host: "",
      tingkat: typeof tingkat === "string" && Object.hasOwn(TINGKAT_LOMBA, tingkat) ? tingkat : "sedang",
      mode: typeof mode === "string" && Object.hasOwn(MODE_LOMBA, mode) ? mode : "cepat",
    });
    this.setState(state);

    for (const [kunci, daftar] of [["tingkat", TINGKAT_LOMBA], ["mode", MODE_LOMBA]]) {
      this.onMessage(kunci, (client, nilai) => {
        if (state.status !== "menunggu" || client.sessionId !== state.host || nilai === state[kunci]
          || typeof nilai !== "string" || !Object.hasOwn(daftar, nilai)) return;
        state[kunci] = nilai;
        for (const p of state.pemain.values()) p.siap = false;
      });
    }
    this.onMessage("siap", (client, data) => {
      if (state.status !== "menunggu" || data?.tingkat !== state.tingkat || data.mode !== state.mode || typeof data.siap !== "boolean") return;
      const p = state.pemain.get(client.sessionId);
      if (!p) return;
      p.siap = data.siap;
      if (state.pemain.size !== 2 || ![...state.pemain.values()].every((x) => x.siap)) return;
      this.lock();
      this.rondeBerikut();
    });
    this.onMessage("jawab", (client, data) => {
      const sekarang = Date.now();
      if (state.status !== "bermain" || data?.ronde !== state.ronde || sekarang >= this.batas) return;
      const p = state.pemain.get(client.sessionId);
      if (!p || p.dijawab || !Number.isInteger(data.pilihan) || data.pilihan < 0 || data.pilihan >= state.pilihan.length) return;
      p.dijawab = true;
      if (data.pilihan === this.kunci) {
        p.poin++;
        p.durasiBenar += Math.max(0, sekarang - this.mulaiRonde);
        if (state.mode === "rebutan") { this.rondeBerikut(); return; }
      }
      if ([...state.pemain.values()].every((x) => x.dijawab)) this.rondeBerikut();
    });
    this.clock.setInterval(() => {
      if (state.status !== "bermain") return;
      state.sisa = Math.max(0, Math.ceil((this.batas - Date.now()) / 1000));
      if (state.sisa === 0) this.rondeBerikut();
    }, 200);
  }

  rondeBerikut() {
    const s = this.state;
    if (s.ronde >= JUMLAH_RONDE) {
      const [a, b] = [...s.pemain.values()];
      const beda = a.poin - b.poin || (s.mode === "cepat" ? b.durasiBenar - a.durasiBenar : 0);
      s.pemenang = beda === 0 ? "" : beda > 0 ? a.nama : b.nama;
      s.status = "selesai";
      return;
    }
    const soal = soalLomba(s.ronde, s.tingkat);
    const waktu = TINGKAT_LOMBA[s.tingkat].waktu;
    s.ronde++;
    s.soal = soal.teks;
    s.pilihan = new ArraySchema(...soal.pilihan);
    this.kunci = soal.kunci;
    this.mulaiRonde = Date.now();
    this.batas = this.mulaiRonde + waktu * 1000;
    s.sisa = waktu;
    for (const p of s.pemain.values()) p.dijawab = false;
    s.status = "bermain";
  }

  onAuth(client, options) {
    if (options?.meja !== this.meja) throw new ServerError(4403, "Meja permainan tidak sesuai.");
    return authTable(this, options);
  }

  onJoin(client) {
    const p = new Pemain();
    Object.assign(p, { nama: client.auth.name, poin: 0, durasiBenar: 0, siap: false, dijawab: false });
    this.state.pemain.set(client.sessionId, p);
    if (!this.state.host) this.state.host = client.sessionId;
  }

  onLeave(client) {
    this.state.pemain.delete(client.sessionId);
    if (this.state.host === client.sessionId) this.state.host = this.state.pemain.keys().next().value || "";
    if (this.state.status === "menunggu") {
      for (const p of this.state.pemain.values()) p.siap = false;
    }
    if (this.state.status !== "bermain") return;
    this.state.pemenang = this.state.pemain.values().next().value?.nama || "";
    this.state.status = "selesai";
  }
}
