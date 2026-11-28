import 'package:material_ui/material_ui.dart';

import '../state/app_state.dart';

/// Mengubah alamat server, misalnya alamat trycloudflare.com yang baru.
Future<void> bukaDialogServer(BuildContext context, AppState state) async {
  final ctrl = TextEditingController(text: state.serverUrl.toString());
  String? galat;
  await showDialog<void>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) => AlertDialog(
        title: const Text('Alamat server'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Contoh: https://nama-acak.trycloudflare.com atau http://192.168.1.5:2567'),
            const SizedBox(height: 12),
            TextField(
              key: const Key('server-url'),
              controller: ctrl,
              keyboardType: TextInputType.url,
              autocorrect: false,
              decoration: InputDecoration(labelText: 'Alamat', errorText: galat),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          FilledButton(
            onPressed: () async {
              final url = normalisasiAlamat(ctrl.text);
              if (url == null) {
                setState(() => galat = 'Alamat harus diawali http:// atau https://');
                return;
              }
              await state.setServerUrl(url);
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    ),
  );
}

/// Mengembalikan alamat tanpa garis miring dan tanpa /api di akhir, atau null bila tidak valid.
Uri? normalisasiAlamat(String input) {
  var t = input.trim().replaceAll(RegExp(r'/+$'), '');
  if (t.endsWith('/api')) t = t.substring(0, t.length - 4);
  final u = Uri.tryParse(t);
  if (u == null || !(u.scheme == 'http' || u.scheme == 'https') || u.host.isEmpty) return null;
  return u;
}
