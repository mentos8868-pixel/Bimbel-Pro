import { db } from "./db.js";
import { BATAS_PENGATURAN, PENGATURAN_AWAL } from "../shared/pengaturan-game.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS game_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    config TEXT NOT NULL
  )
`);
const baca = db.prepare("SELECT config FROM game_settings WHERE id = 1");
const simpan = db.prepare(`
  INSERT INTO game_settings (id, config) VALUES (1, ?)
  ON CONFLICT(id) DO UPDATE SET config = excluded.config
`);

export function pengaturanGame() {
  const row = baca.get();
  return row ? JSON.parse(row.config) : PENGATURAN_AWAL;
}

export function simpanPengaturanGame(input, ApiError) {
  function angka(grup, kolom, nilai) {
    const [min, max] = BATAS_PENGATURAN[grup][kolom];
    if (!Number.isInteger(nilai) || nilai < min || nilai > max) {
      throw new ApiError(400, `Nilai pengaturan harus berupa bilangan bulat dari ${min} sampai ${max}.`);
    }
    return nilai;
  }
  const config = {};
  for (const grup of ["latihan", "matematika"]) {
    config[grup] = Object.fromEntries(Object.keys(PENGATURAN_AWAL[grup]).map((tingkat) => [
      tingkat,
      Object.fromEntries(Object.keys(BATAS_PENGATURAN[grup]).map((kolom) => [
        kolom, angka(grup, kolom, input?.[grup]?.[tingkat]?.[kolom]),
      ])),
    ]));
  }
  config.tryout = {
    sulit: angka("tryout", "sulit", input?.tryout?.sulit),
    sedang: angka("tryout", "sedang", input?.tryout?.sedang),
  };
  if (config.tryout.sulit + config.tryout.sedang > 100) {
    throw new ApiError(400, "Total persentase soal sulit dan sedang tidak boleh lebih dari 100%.");
  }
  simpan.run(JSON.stringify(config));
  return config;
}
