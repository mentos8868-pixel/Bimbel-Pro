import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../api/models.dart';

enum Mode { loading, loggedOut, ortu, anak }

/// Menyimpan alamat server (shared_preferences di aplikasi sungguhan).
abstract class ServerUrlStore {
  Future<Uri?> load();
  Future<void> save(Uri url);
}

class MemoryServerUrlStore implements ServerUrlStore {
  Uri? url;
  MemoryServerUrlStore([this.url]);
  @override
  Future<Uri?> load() async => url;
  @override
  Future<void> save(Uri u) async => url = u;
}

class AppState extends ChangeNotifier {
  final ApiClient api;
  final ServerUrlStore urlStore;

  /// false di web: alamat server selalu alamat halaman itu sendiri.
  final bool serverUrlEditable;

  Mode mode = Mode.loading;
  Me? me;
  List<ChildReport> reports = const [];
  String? error;

  AppState({required this.api, required this.urlStore, this.serverUrlEditable = true});

  Uri get serverUrl => api.baseUrl;

  Future<void> init() async {
    if (serverUrlEditable) {
      final saved = await urlStore.load();
      if (saved != null) api.baseUrl = saved;
    }
    try {
      await _muatSaya();
    } on ApiException catch (e) {
      error = e.status == 0 ? e.message : null;
      _keluarLokal();
    }
  }

  Future<void> setServerUrl(Uri url) async {
    api.baseUrl = url;
    await urlStore.save(url);
    await api.store.clear();
    _keluarLokal();
  }

  /// Masuk dengan ID masuk (orang tua atau anak) dan kata sandi lewat POST /api/masuk.
  Future<void> login(String login, String password) async {
    await api.send('POST', 'masuk', {'login': login.trim(), 'password': password});
    await _muatSaya();
    if (mode == Mode.loggedOut) throw const ApiException(401, 'Gagal masuk. Coba lagi.');
  }

  Future<void> _muatSaya() async {
    final data = await api.get('saya');
    me = Me.fromJson(Map<String, dynamic>.from(data as Map));
    error = null;
    if (me!.ortu != null) {
      mode = Mode.ortu;
      notifyListeners();
      await refreshReports();
    } else if (me!.anak != null) {
      mode = Mode.anak;
      notifyListeners();
    } else {
      _keluarLokal();
    }
  }

  Future<void> refreshReports() => _jaga(() async {
        final data = await api.get('laporan');
        reports = ((data as Map)['children'] as List? ?? const [])
            .map((c) => ChildReport.fromJson(Map<String, dynamic>.from(c as Map)))
            .toList();
        notifyListeners();
      });

  Future<void> refreshMe() => _jaga(_muatSaya);

  Future<void> updateChild(int id, Map<String, dynamic> patch) => _jaga(() async {
        await api.send('PATCH', 'anak/$id', patch);
        await refreshReports();
      });

  Future<void> logout() async {
    try {
      await api.send('POST', mode == Mode.anak ? 'anak/keluar' : 'keluar');
    } on ApiException {
      // Tetap keluar di perangkat ini walau server tidak bisa dihubungi.
    }
    await api.store.clear();
    _keluarLokal();
  }

  /// Sesi kedaluwarsa (401): kembali ke layar Masuk.
  Future<void> _jaga(Future<void> Function() f) async {
    try {
      await f();
    } on ApiException catch (e) {
      if (e.status == 401) {
        await api.store.clear();
        error = 'Sesi sudah berakhir. Silakan masuk lagi.';
        _keluarLokal();
        return;
      }
      rethrow;
    }
  }

  void _keluarLokal() {
    mode = Mode.loggedOut;
    me = null;
    reports = const [];
    notifyListeners();
  }
}
