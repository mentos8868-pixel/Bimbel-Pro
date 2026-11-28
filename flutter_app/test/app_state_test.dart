import 'package:bimbel_pro/state/app_state.dart';
import 'package:bimbel_pro/ui/server_dialog.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fake_server.dart';

void main() {
  test('tanpa sesi, init berakhir di layar masuk', () async {
    final s = FakeServer().buatState();
    await s.init();
    expect(s.mode, Mode.loggedOut);
  });

  test('login orang tua memuat laporan', () async {
    final s = FakeServer().buatState();
    await s.init();
    await s.login('ortu', 'rahasia123');
    expect(s.mode, Mode.ortu);
    expect(s.reports.single.child.name, 'Budi');
  });

  test('login anak membuka beranda anak', () async {
    final s = FakeServer().buatState();
    await s.login('budi', 'rahasia123');
    expect(s.mode, Mode.anak);
    expect(s.me!.anak!.name, 'Budi');
  });

  test('sesi kedaluwarsa (401) kembali ke layar masuk', () async {
    final server = FakeServer();
    final s = server.buatState();
    await s.login('ortu', 'rahasia123');
    server.laporan401 = true;
    await s.refreshReports();
    expect(s.mode, Mode.loggedOut);
    expect(await server.store.load(), isEmpty);
    expect(s.error, contains('Sesi sudah berakhir'));
  });

  test('ubah pengaturan anak lalu laporan dimuat ulang', () async {
    final server = FakeServer();
    final s = server.buatState();
    await s.login('ortu', 'rahasia123');
    await s.updateChild(1, {'limitMin': 90});
    expect(s.reports.single.child.limitMin, 90);
  });

  test('keluar menghapus sesi', () async {
    final server = FakeServer();
    final s = server.buatState();
    await s.login('ortu', 'rahasia123');
    await s.logout();
    expect(s.mode, Mode.loggedOut);
    expect(await server.store.load(), isEmpty);
  });

  test('ganti alamat server menghapus sesi lama', () async {
    final server = FakeServer();
    final s = server.buatState();
    await s.login('ortu', 'rahasia123');
    await s.setServerUrl(Uri.parse('https://baru.trycloudflare.com'));
    expect(s.serverUrl.host, 'baru.trycloudflare.com');
    expect(s.mode, Mode.loggedOut);
    expect(await server.store.load(), isEmpty);
  });

  test('normalisasi alamat server', () {
    expect(normalisasiAlamat(' https://a.trycloudflare.com/ ').toString(), 'https://a.trycloudflare.com');
    expect(normalisasiAlamat('http://192.168.1.5:2567/api').toString(), 'http://192.168.1.5:2567');
    expect(normalisasiAlamat('a.trycloudflare.com'), isNull);
    expect(normalisasiAlamat('ftp://x'), isNull);
  });
}
