import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api/api_client.dart';
import 'api/session_store.dart';
import 'app.dart';
import 'state/app_state.dart';

/// Alamat server bawaan. Emulator Android melihat laptop sebagai 10.0.2.2.
Uri alamatBawaan() {
  if (kIsWeb) return Uri.parse(Uri.base.origin);
  const dariBuild = String.fromEnvironment('BIMBEL_SERVER');
  if (dariBuild.isNotEmpty) return Uri.parse(dariBuild);
  return Uri.parse(defaultTargetPlatform == TargetPlatform.android ? 'http://10.0.2.2:2567' : 'http://localhost:2567');
}

class PrefsServerUrlStore implements ServerUrlStore {
  static const _key = 'alamat_server';
  @override
  Future<Uri?> load() async {
    final s = (await SharedPreferences.getInstance()).getString(_key);
    return s == null ? null : Uri.tryParse(s);
  }

  @override
  Future<void> save(Uri url) async => (await SharedPreferences.getInstance()).setString(_key, url.toString());
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient(
    baseUrl: alamatBawaan(),
    // Di web, cookie HttpOnly diurus browser; aplikasi tidak bisa (dan tidak perlu) membacanya.
    store: kIsWeb ? MemorySessionStore() : SecureSessionStore(),
    manageCookies: !kIsWeb,
  );
  final state = AppState(api: api, urlStore: PrefsServerUrlStore(), serverUrlEditable: !kIsWeb);
  state.init();
  runApp(BimbelApp(state: state));
}
