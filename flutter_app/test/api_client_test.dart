import 'dart:io';

import 'package:bimbel_pro/api/api_client.dart';
import 'package:bimbel_pro/api/models.dart';
import 'package:bimbel_pro/api/session_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'fake_server.dart';

void main() {
  group('ApiClient', () {
    late FakeServer server;
    late ApiClient api;
    setUp(() {
      server = FakeServer();
      api = ApiClient(baseUrl: Uri.parse('http://server.test/'), store: server.store, client: server.client);
    });

    test('menyimpan cookie dari Set-Cookie dan mengirimnya lagi', () async {
      await api.send('POST', 'masuk', {'login': 'ortu', 'password': 'rahasia123'});
      expect(await server.store.load(), {'bp_ortu': 'tok-ortu'});
      await api.get('saya');
      expect(server.requests.last.headers['cookie'], 'bp_ortu=tok-ortu');
      expect(server.requests.last.url.toString(), 'http://server.test/api/saya');
    });

    test('Max-Age=0 menghapus cookie', () async {
      await api.send('POST', 'masuk', {'login': 'ortu', 'password': 'rahasia123'});
      await api.send('POST', 'keluar');
      expect(await server.store.load(), isEmpty);
    });

    test('POST membawa x-bimbel dan JSON, GET tidak membawa x-bimbel', () async {
      await api.send('POST', 'masuk', {'login': 'ortu', 'password': 'rahasia123'});
      final post = server.requests.first;
      expect(post.headers['x-bimbel'], '1');
      expect(post.headers['content-type'], startsWith('application/json'));
      await api.get('saya');
      expect(server.requests.last.headers.containsKey('x-bimbel'), isFalse);
    });

    test('galat server dengan JSON memakai pesan dari server', () async {
      expect(
        () => api.send('POST', 'masuk', {'login': 'x', 'password': 'y'}),
        throwsA(isA<ApiException>().having((e) => e.status, 'status', 401).having((e) => e.message, 'message', 'ID masuk atau kata sandi salah.')),
      );
    });

    test('jawaban bukan JSON menjadi pesan umum', () async {
      final a = ApiClient(
        baseUrl: Uri.parse('http://server.test'),
        store: MemorySessionStore(),
        client: MockClient((_) async => http.Response('<html>Bad gateway</html>', 502)),
      );
      expect(() => a.get('saya'), throwsA(isA<ApiException>().having((e) => e.message, 'message', pesanGalatServer).having((e) => e.status, 's', 502)));
    });

    test('server tidak bisa dihubungi menjadi status 0', () async {
      final a = ApiClient(
        baseUrl: Uri.parse('http://server.test'),
        store: MemorySessionStore(),
        client: MockClient((_) async => throw const SocketException('refused')),
      );
      expect(() => a.get('saya'), throwsA(isA<ApiException>().having((e) => e.status, 'status', 0).having((e) => e.message, 'm', pesanTakTerhubung)));
    });

    test('manageCookies false tidak mengirim cookie (web)', () async {
      await server.store.save({'bp_ortu': 'x'});
      final a = ApiClient(baseUrl: Uri.parse('http://server.test'), store: server.store, client: server.client, manageCookies: false);
      await a.get('saya');
      expect(server.requests.last.headers.containsKey('cookie'), isFalse);
    });
  });

  test('laporan dari server diubah menjadi model', () {
    final r = ChildReport.fromJson(contohLaporan());
    expect(r.child.name, 'Budi');
    expect(r.child.kelasLabel, 'Kelas 4');
    expect(r.week.length, 7);
    expect(r.week.last.minutes, 60);
    expect(r.stats['catur']!.menang, 2);
    expect(r.recent.single.outcome, 'menang');
    expect(ChildReport.fromJson(contohLaporan(limitMin: 0)).child.sisaMenit, isNull);
    expect(Child.fromJson(contohAnak(limitMin: 30, usedMin: 45)).sisaMenit, 0);
  });
}
