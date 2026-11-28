import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';

import '../api/api_client.dart';
import '../state/app_state.dart';
import 'server_dialog.dart';
import 'theme.dart';

class LoginScreen extends StatefulWidget {
  final AppState state;
  const LoginScreen({super.key, required this.state});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _login = TextEditingController();
  final _sandi = TextEditingController();
  bool _memuat = false;
  bool _lihat = false;
  String? _galat;

  @override
  void initState() {
    super.initState();
    _galat = widget.state.error;
  }

  Future<void> _masuk() async {
    if (_login.text.trim().isEmpty || _sandi.text.isEmpty) {
      setState(() => _galat = 'Isi ID masuk dan kata sandi.');
      return;
    }
    setState(() {
      _memuat = true;
      _galat = null;
    });
    try {
      await widget.state.login(_login.text, _sandi.text);
    } on ApiException catch (e) {
      if (mounted) setState(() => _galat = e.message);
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  void _daftar() {
    final alamat = '${widget.state.serverUrl.toString().replaceAll(RegExp(r'/+$'), '')}/orangtua.html';
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Daftar akun orang tua'),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Untuk saat ini, pendaftaran dan penambahan akun anak dilakukan di dashboard web:'),
          const SizedBox(height: 8),
          SelectableText(alamat, style: const TextStyle(fontWeight: FontWeight.w600)),
        ]),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: alamat));
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Alamat disalin.')));
            },
            child: const Text('Salin alamat'),
          ),
          FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Tutup')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: AutofillGroup(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Icon(Icons.school_rounded, size: 56, color: Warna.primary),
                        const SizedBox(height: 8),
                        Text('Bimbel Pro', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        const Text('Masuk sebagai orang tua atau anak', textAlign: TextAlign.center, style: TextStyle(color: Warna.muted)),
                        const SizedBox(height: 24),
                        TextField(
                          key: const Key('login'),
                          controller: _login,
                          autocorrect: false,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.username],
                          decoration: const InputDecoration(labelText: 'ID masuk', prefixIcon: Icon(Icons.person_outline)),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          key: const Key('sandi'),
                          controller: _sandi,
                          obscureText: !_lihat,
                          autofillHints: const [AutofillHints.password],
                          onSubmitted: (_) => _memuat ? null : _masuk(),
                          decoration: InputDecoration(
                            labelText: 'Kata sandi',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              tooltip: _lihat ? 'Sembunyikan' : 'Tampilkan',
                              icon: Icon(_lihat ? Icons.visibility_off : Icons.visibility),
                              onPressed: () => setState(() => _lihat = !_lihat),
                            ),
                          ),
                        ),
                        if (_galat != null) ...[
                          const SizedBox(height: 12),
                          Text(_galat!, key: const Key('galat'), style: const TextStyle(color: Warna.error)),
                        ],
                        const SizedBox(height: 20),
                        FilledButton(
                          key: const Key('masuk'),
                          onPressed: _memuat ? null : _masuk,
                          child: _memuat
                              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                              : const Text('Masuk'),
                        ),
                        const SizedBox(height: 8),
                        TextButton(onPressed: _daftar, child: const Text('Belum punya akun? Daftar di web')),
                        if (state.serverUrlEditable)
                          TextButton.icon(
                            key: const Key('ubah-server'),
                            onPressed: () async {
                              await bukaDialogServer(context, state);
                              if (mounted) setState(() {});
                            },
                            icon: const Icon(Icons.dns_outlined, size: 18),
                            label: Text('Server: ${state.serverUrl.host}${state.serverUrl.hasPort ? ':${state.serverUrl.port}' : ''}'),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
