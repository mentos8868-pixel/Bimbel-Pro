import 'dart:convert';

import 'package:http/http.dart' as http;

import 'session_store.dart';

class ApiException implements Exception {
  final int status;
  final String message;
  const ApiException(this.status, this.message);

  @override
  String toString() => message;
}

const pesanTakTerhubung = 'Server tidak bisa dihubungi. Cek alamat server.';
const pesanGalatServer = 'Terjadi kesalahan di server.';

/// Klien API Bimbel Pro (server/accounts.js).
///
/// Di native, cookie sesi dari `Set-Cookie` disimpan sendiri lalu dikirim lagi
/// lewat header `Cookie`. Di web ([manageCookies] = false) browser yang mengurusnya.
class ApiClient {
  Uri baseUrl;
  final SessionStore store;
  final http.Client _client;
  final bool manageCookies;

  ApiClient({required this.baseUrl, required this.store, http.Client? client, this.manageCookies = true})
      : _client = client ?? http.Client();

  Uri _uri(String path) {
    final base = baseUrl.toString().replaceAll(RegExp(r'/+$'), '');
    return Uri.parse('$base/api/$path');
  }

  Future<dynamic> get(String path) => send('GET', path);

  Future<dynamic> send(String method, String path, [Map<String, dynamic>? body]) async {
    final req = http.Request(method, _uri(path));
    if (method != 'GET') {
      req.headers['x-bimbel'] = '1';
      req.headers['content-type'] = 'application/json';
      req.body = jsonEncode(body ?? const {});
    }
    if (manageCookies) {
      final cookies = await store.load();
      if (cookies.isNotEmpty) {
        req.headers['cookie'] = cookies.entries.map((e) => '${e.key}=${e.value}').join('; ');
      }
    }
    http.Response res;
    try {
      res = await http.Response.fromStream(await _client.send(req).timeout(const Duration(seconds: 20)));
    } catch (_) {
      throw const ApiException(0, pesanTakTerhubung);
    }
    if (manageCookies) await _simpanCookie(res.headers['set-cookie']);

    dynamic data;
    try {
      data = res.body.isEmpty ? null : jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      data = null;
    }
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (data == null && res.body.isNotEmpty) throw ApiException(res.statusCode, pesanGalatServer);
      return data;
    }
    final pesan = data is Map && data['error'] is String ? data['error'] as String : pesanGalatServer;
    throw ApiException(res.statusCode, pesan);
  }

  /// package:http menggabungkan beberapa Set-Cookie dengan koma.
  Future<void> _simpanCookie(String? header) async {
    if (header == null || header.isEmpty) return;
    final cookies = await store.load();
    var berubah = false;
    // Pisah per cookie: koma yang diikuti "nama=" (bukan koma di dalam atribut Expires).
    for (final bagian in header.split(RegExp(r',(?=\s*[A-Za-z0-9_\-]+=)'))) {
      final parts = bagian.trim().split(';');
      final i = parts.first.indexOf('=');
      if (i <= 0) continue;
      final name = parts.first.substring(0, i).trim();
      if (name != 'bp_ortu' && name != 'bp_anak') continue;
      final value = Uri.decodeComponent(parts.first.substring(i + 1).trim());
      final hapus = parts.skip(1).any((a) => a.trim().toLowerCase() == 'max-age=0');
      if (value.isEmpty || hapus) {
        berubah |= cookies.remove(name) != null;
      } else {
        cookies[name] = value;
        berubah = true;
      }
    }
    if (berubah) await store.save(cookies);
  }
}
