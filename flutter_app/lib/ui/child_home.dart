import 'package:material_ui/material_ui.dart';

import '../state/app_state.dart';
import 'theme.dart';

class ChildHome extends StatelessWidget {
  final AppState state;
  const ChildHome({super.key, required this.state});

  @override
  Widget build(BuildContext context) {
    final anak = state.me?.anak;
    final sisa = anak?.sisaMenit;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bimbel Pro'),
        actions: [
          IconButton(tooltip: 'Muat ulang', icon: const Icon(Icons.refresh), onPressed: state.refreshMe),
          IconButton(key: const Key('keluar'), tooltip: 'Keluar', icon: const Icon(Icons.logout), onPressed: state.logout),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Halo, ${anak?.name ?? ''}!', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(
            sisa == null ? 'Waktu bermain hari ini: tanpa batas' : 'Sisa waktu bermain hari ini: $sisa menit',
            key: const Key('sisa-waktu'),
            style: TextStyle(color: sisa == 0 ? Warna.error : Warna.muted, fontSize: 16),
          ),
          const SizedBox(height: 20),
          LayoutBuilder(builder: (context, c) {
            final lebar = c.maxWidth > 600 ? (c.maxWidth - 16) / 2 : c.maxWidth;
            return Wrap(spacing: 16, runSpacing: 16, children: [
              SizedBox(width: lebar, child: const _KartuRuang(ikon: Icons.menu_book_rounded, judul: 'Ruang Bimbel', isi: 'Latihan soal Kurikulum Merdeka, Cambridge, dan Singapura.')),
              SizedBox(width: lebar, child: const _KartuRuang(ikon: Icons.sports_esports_rounded, judul: 'Ruang Game', isi: 'Catur, Scramble, dan Kartu Kilat.')),
            ]);
          }),
        ],
      ),
    );
  }
}

class _KartuRuang extends StatelessWidget {
  final IconData ikon;
  final String judul, isi;
  const _KartuRuang({required this.ikon, required this.judul, required this.isi});

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(ikon, size: 36, color: Warna.primary),
              const Spacer(),
              const Chip(label: Text('Segera hadir'), visualDensity: VisualDensity.compact),
            ]),
            const SizedBox(height: 12),
            Text(judul, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(isi, style: const TextStyle(color: Warna.muted)),
          ]),
        ),
      );
}
