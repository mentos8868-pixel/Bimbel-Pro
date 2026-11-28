import 'dart:convert';

import 'package:bimbel_pro/api/api_client.dart';
import 'package:bimbel_pro/api/session_store.dart';
import 'package:bimbel_pro/state/app_state.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

Map<String, dynamic> contohAnak({int id = 1, String name = 'Budi', int limitMin = 60, int usedMin = 20}) => {
      'id': id, 'name': name, 'jenjang': 'SD', 'kelas': 4, 'color': '#4f9cf0', 'limitMin': limitMin,
      'usedMin': usedMin, 'allowStrangers': false, 'approveFriends': true, 'chat': 'siap', 'loginAnak': 'budi',
    };

Map<String, dynamic> contohLaporan({int limitMin = 60}) => {
      ...contohAnak(limitMin: limitMin),
      'week': [
        for (var i = 0; i < 7; i++) {'day': '2026-11-${(22 + i).toString().padLeft(2, '0')}', 'minutes': i * 10},
      ],
      'stats': {
        'catur': {'main': 3, 'menang': 2, 'kalah': 1, 'seri': 0},
        'scramble': {'main': 1, 'menang': 0, 'kalah': 0, 'seri': 1},
        'kartu': {'main': 0, 'menang': 0, 'kalah': 0, 'seri': 0},
      },
      'recent': [
        {'game': 'catur', 'mode': 'bot', 'outcome': 'menang', 'score': 12, 'at': 1764300000000},
      ],
    };

/// Server tiruan sederhana yang meniru server/accounts.js.
class FakeServer {
  final requests = <http.Request>[];
  String? sesi; // 'ortu' | 'anak'
  int limitMin = 60;
  bool punyaAnak = true;
  bool laporan401 = false;

  late final client = MockClient((req) async {
    requests.add(req);
    final path = req.url.path;
    final masuk = req.headers['cookie']?.contains('bp_') ?? false;
    http.Response json(int s, Object b, [Map<String, String> h = const {}]) =>
        http.Response(jsonEncode(b), s, headers: {'content-type': 'application/json', ...h});
    if (path == '/api/masuk') {
      final b = jsonDecode(req.body) as Map;
      if (b['login'] == 'ortu' && b['password'] == 'rahasia123') {
        sesi = 'ortu';
        return json(200, {'ok': true}, {'set-cookie': 'bp_ortu=tok-ortu; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000'});
      }
      if (b['login'] == 'budi' && b['password'] == 'rahasia123') {
        sesi = 'anak';
        return json(200, {'sebagai': 'anak'}, {'set-cookie': 'bp_anak=tok-anak; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000'});
      }
      return json(401, {'error': 'ID masuk atau kata sandi salah.'});
    }
    if (path == '/api/saya') {
      return json(200, {
        'ortu': masuk && sesi == 'ortu' ? {'id': 7, 'name': 'Ibu Rina', 'login': 'ortu', 'kepala': true} : null,
        'anak': masuk && sesi == 'anak' ? contohAnak() : null,
        'children': masuk && sesi == 'ortu' && punyaAnak ? [contohAnak(limitMin: limitMin)] : [],
      });
    }
    if (path == '/api/laporan') {
      if (laporan401 || !masuk) return json(401, {'error': 'Silakan masuk sebagai orang tua.'});
      return json(200, {'children': punyaAnak ? [contohLaporan(limitMin: limitMin)] : []});
    }
    if (path == '/api/anak/1' && req.method == 'PATCH') {
      final b = jsonDecode(req.body) as Map;
      if (b['limitMin'] is int) limitMin = b['limitMin'] as int;
      return json(200, {'child': contohAnak(limitMin: limitMin)});
    }
    if (path == '/api/keluar' || path == '/api/anak/keluar') {
      sesi = null;
      return json(200, {'ok': true}, {'set-cookie': 'bp_ortu=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0, bp_anak=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'});
    }
    return json(404, {'error': 'Alamat tidak ditemukan.'});
  });

  final store = MemorySessionStore();

  AppState buatState() => AppState(
        api: ApiClient(baseUrl: Uri.parse('http://server.test'), store: store, client: client),
        urlStore: MemoryServerUrlStore(),
      );
}
