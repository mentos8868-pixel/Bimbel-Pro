import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Tempat menyimpan cookie sesi (bp_ortu / bp_anak) dari server.
abstract class SessionStore {
  Future<Map<String, String>> load();
  Future<void> save(Map<String, String> cookies);
  Future<void> clear();
}

/// Untuk tes dan versi web (di web cookie diurus browser).
class MemorySessionStore implements SessionStore {
  Map<String, String> _data = {};

  @override
  Future<Map<String, String>> load() async => Map.of(_data);

  @override
  Future<void> save(Map<String, String> cookies) async => _data = Map.of(cookies);

  @override
  Future<void> clear() async => _data = {};
}

/// Android, iOS, Windows: disimpan di penyimpanan aman perangkat.
class SecureSessionStore implements SessionStore {
  static const _key = 'bimbel_sesi';
  final FlutterSecureStorage _storage;

  SecureSessionStore([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  @override
  Future<Map<String, String>> load() async {
    final raw = await _storage.read(key: _key);
    if (raw == null || raw.isEmpty) return {};
    try {
      return Map<String, String>.from(jsonDecode(raw) as Map);
    } catch (_) {
      return {};
    }
  }

  @override
  Future<void> save(Map<String, String> cookies) => _storage.write(key: _key, value: jsonEncode(cookies));

  @override
  Future<void> clear() => _storage.delete(key: _key);
}
