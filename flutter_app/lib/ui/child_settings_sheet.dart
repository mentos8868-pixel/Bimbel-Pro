import 'package:material_ui/material_ui.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../state/app_state.dart';

const pilihanBatas = [0, 30, 60, 90, 120];

Future<void> bukaPengaturanAnak(BuildContext context, AppState state, Child child) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => ChildSettingsSheet(state: state, child: child),
    );

class ChildSettingsSheet extends StatefulWidget {
  final AppState state;
  final Child child;
  const ChildSettingsSheet({super.key, required this.state, required this.child});

  @override
  State<ChildSettingsSheet> createState() => _ChildSettingsSheetState();
}

class _ChildSettingsSheetState extends State<ChildSettingsSheet> {
  late int _batas = widget.child.limitMin;
  late bool _orangLain = widget.child.allowStrangers;
  late bool _setujuiTeman = widget.child.approveFriends;
  late String _chat = pilihanChat.containsKey(widget.child.chat) ? widget.child.chat : 'mati';
  late final _batasCtrl = TextEditingController(text: '${widget.child.limitMin}');
  bool _menyimpan = false;
  String? _galat;

  Future<void> _simpan() async {
    final batas = int.tryParse(_batasCtrl.text.trim());
    if (batas == null || batas < 0 || batas > 600) {
      setState(() => _galat = 'Batas waktu harus 0–600 menit.');
      return;
    }
    setState(() {
      _menyimpan = true;
      _galat = null;
    });
    final patch = <String, dynamic>{};
    final c = widget.child;
    if (batas != c.limitMin) patch['limitMin'] = batas;
    if (_orangLain != c.allowStrangers) patch['allowStrangers'] = _orangLain;
    if (_setujuiTeman != c.approveFriends) patch['approveFriends'] = _setujuiTeman;
    if (_chat != c.chat) patch['chat'] = _chat;
    try {
      if (patch.isNotEmpty) await widget.state.updateChild(c.id, patch);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Pengaturan ${c.name} disimpan.')));
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _galat = e.message);
    } finally {
      if (mounted) setState(() => _menyimpan = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bawah = MediaQuery.of(context).viewInsets.bottom;
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + bawah),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Pengaturan ${widget.child.name}', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            const Text('Batas waktu bermain per hari', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final m in pilihanBatas)
                  ChoiceChip(
                    key: Key('batas-$m'),
                    label: Text(m == 0 ? 'Tanpa batas' : '$m menit'),
                    selected: _batas == m,
                    onSelected: (_) => setState(() {
                      _batas = m;
                      _batasCtrl.text = '$m';
                    }),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              key: const Key('batas-isian'),
              controller: _batasCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Atau isi sendiri (menit, 0 = tanpa batas)'),
              onChanged: (v) => setState(() => _batas = int.tryParse(v) ?? _batas),
            ),
            const SizedBox(height: 12),
            SwitchListTile(
              key: const Key('orang-lain'),
              contentPadding: EdgeInsets.zero,
              title: const Text('Boleh "Cari lawan" dengan pemain lain'),
              subtitle: const Text('Tetap hanya dipertemukan dengan yang sejenjang'),
              value: _orangLain,
              onChanged: (v) => setState(() => _orangLain = v),
            ),
            SwitchListTile(
              key: const Key('setujui-teman'),
              contentPadding: EdgeInsets.zero,
              title: const Text('Pertemanan perlu persetujuan orang tua'),
              value: _setujuiTeman,
              onChanged: (v) => setState(() => _setujuiTeman = v),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              key: const Key('chat'),
              initialValue: _chat,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Chat di arena'),
              items: [for (final e in pilihanChat.entries) DropdownMenuItem(value: e.key, child: Text(e.value, overflow: TextOverflow.ellipsis))],
              onChanged: (v) => setState(() => _chat = v ?? _chat),
            ),
            if (widget.child.jenjang == 'SD' && _chat == 'bebas')
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text('Untuk anak SD, server otomatis memakai pesan siap pakai.', style: TextStyle(fontSize: 12)),
              ),
            if (_galat != null) ...[
              const SizedBox(height: 12),
              Text(_galat!, key: const Key('galat-pengaturan'), style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              key: const Key('simpan'),
              onPressed: _menyimpan ? null : _simpan,
              child: Text(_menyimpan ? 'Menyimpan…' : 'Simpan'),
            ),
          ],
        ),
      ),
    );
  }
}
