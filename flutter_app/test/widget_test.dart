import 'dart:convert';

import 'package:bimbel_pro/app.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fake_server.dart';

Future<FakeServer> bukaAplikasi(WidgetTester tester, {bool punyaAnak = true, int limitMin = 60}) async {
  tester.view.physicalSize = const Size(1080, 2400);
  tester.view.devicePixelRatio = 2.5;
  addTearDown(tester.view.reset);
  final server = FakeServer()
    ..punyaAnak = punyaAnak
    ..limitMin = limitMin;
  final state = server.buatState();
  await state.init();
  await tester.pumpWidget(BimbelApp(state: state));
  await tester.pumpAndSettle();
  return server;
}

Future<void> masuk(WidgetTester tester, String login, String sandi) async {
  await tester.enterText(find.byKey(const Key('login')), login);
  await tester.enterText(find.byKey(const Key('sandi')), sandi);
  await tester.tap(find.byKey(const Key('masuk')));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('kata sandi salah menampilkan pesan dari server', (tester) async {
    await bukaAplikasi(tester);
    await masuk(tester, 'ortu', 'salah');
    expect(find.text('ID masuk atau kata sandi salah.'), findsOneWidget);
  });

  testWidgets('kolom kosong ditolak tanpa memanggil server', (tester) async {
    final server = await bukaAplikasi(tester);
    final awal = server.requests.length;
    await tester.tap(find.byKey(const Key('masuk')));
    await tester.pumpAndSettle();
    expect(find.text('Isi ID masuk dan kata sandi.'), findsOneWidget);
    expect(server.requests.length, awal);
  });

  testWidgets('orang tua masuk dan melihat dashboard', (tester) async {
    await bukaAplikasi(tester);
    await masuk(tester, 'ortu', 'rahasia123');
    expect(find.text('Dashboard Orang Tua'), findsOneWidget);
    expect(find.text('Budi'), findsOneWidget);
    expect(find.text('20 dari 60 menit'), findsOneWidget);
    expect(find.text('Catur'), findsOneWidget);
    expect(find.text('Catur · Menang'), findsOneWidget);
  });

  testWidgets('judul kolom statistik tidak terpotong di HP sempit', (tester) async {
    await bukaAplikasi(tester);
    tester.view.physicalSize = const Size(800, 1800); // 320 x 720 logis
    await masuk(tester, 'ortu', 'rahasia123');
    final satuBaris = tester.getSize(find.text('Catur').first).height;
    for (final judul in ['Main', 'Menang', 'Kalah', 'Seri']) {
      expect(tester.getSize(find.text(judul)).height, lessThanOrEqualTo(satuBaris), reason: '$judul terpotong');
    }
  });

  testWidgets('batas 0 ditampilkan sebagai tanpa batas', (tester) async {
    await bukaAplikasi(tester, limitMin: 0);
    await masuk(tester, 'ortu', 'rahasia123');
    expect(find.text('20 menit · Tanpa batas'), findsOneWidget);
  });

  testWidgets('tanpa anak menampilkan pesan kosong', (tester) async {
    await bukaAplikasi(tester, punyaAnak: false);
    await masuk(tester, 'ortu', 'rahasia123');
    expect(find.byKey(const Key('kosong')), findsOneWidget);
  });

  testWidgets('simpan pengaturan mengirim PATCH limitMin 90', (tester) async {
    final server = await bukaAplikasi(tester);
    await masuk(tester, 'ortu', 'rahasia123');
    await tester.tap(find.byKey(const Key('pengaturan-1')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('batas-90')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('simpan')));
    await tester.pumpAndSettle();
    final patch = server.requests.lastWhere((r) => r.method == 'PATCH');
    expect(patch.url.path, '/api/anak/1');
    expect(jsonDecode(patch.body), {'limitMin': 90});
    expect(find.text('20 dari 90 menit'), findsOneWidget);
  });

  testWidgets('batas di luar 0–600 ditolak', (tester) async {
    final server = await bukaAplikasi(tester);
    await masuk(tester, 'ortu', 'rahasia123');
    await tester.tap(find.byKey(const Key('pengaturan-1')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('batas-isian')), '900');
    await tester.tap(find.byKey(const Key('simpan')));
    await tester.pumpAndSettle();
    expect(find.text('Batas waktu harus 0–600 menit.'), findsOneWidget);
    expect(server.requests.where((r) => r.method == 'PATCH'), isEmpty);
  });

  testWidgets('anak masuk melihat beranda anak, lalu keluar', (tester) async {
    await bukaAplikasi(tester);
    await masuk(tester, 'budi', 'rahasia123');
    expect(find.text('Halo, Budi!'), findsOneWidget);
    expect(find.text('Sisa waktu bermain hari ini: 40 menit'), findsOneWidget);
    expect(find.text('Segera hadir'), findsNWidgets(2));
    await tester.tap(find.byKey(const Key('keluar')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('masuk')), findsOneWidget);
  });
}
