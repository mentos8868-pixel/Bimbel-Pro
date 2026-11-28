import 'package:material_ui/material_ui.dart';

import '../api/api_client.dart';
import '../api/models.dart';
import '../state/app_state.dart';
import 'child_settings_sheet.dart';
import 'theme.dart';
import 'week_chart.dart';

class ParentDashboard extends StatelessWidget {
  final AppState state;
  const ParentDashboard({super.key, required this.state});

  Future<void> _segarkan(BuildContext context) async {
    try {
      await state.refreshReports();
    } on ApiException catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final reports = state.reports;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard Orang Tua'),
        actions: [
          IconButton(tooltip: 'Muat ulang', icon: const Icon(Icons.refresh), onPressed: () => _segarkan(context)),
          IconButton(key: const Key('keluar'), tooltip: 'Keluar', icon: const Icon(Icons.logout), onPressed: state.logout),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _segarkan(context),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (state.me?.ortu != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text('Halo, ${state.me!.ortu!.name}!', style: Theme.of(context).textTheme.titleMedium),
              ),
            if (reports.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('Belum ada akun anak. Tambahkan lewat dashboard web.', key: Key('kosong'), textAlign: TextAlign.center),
                ),
              ),
            for (final r in reports)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 720),
                    child: KartuAnak(report: r, onPengaturan: () => bukaPengaturanAnak(context, state, r.child)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class KartuAnak extends StatelessWidget {
  final ChildReport report;
  final VoidCallback onPengaturan;
  const KartuAnak({super.key, required this.report, required this.onPengaturan});

  @override
  Widget build(BuildContext context) {
    final c = report.child;
    final judul = Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              CircleAvatar(backgroundColor: warnaDariHex(c.color), child: Text(c.name.isEmpty ? '?' : c.name[0].toUpperCase(), style: const TextStyle(color: Colors.white))),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(c.name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  Text(c.kelasLabel, style: const TextStyle(color: Warna.muted)),
                ]),
              ),
              OutlinedButton.icon(key: Key('pengaturan-${c.id}'), onPressed: onPengaturan, icon: const Icon(Icons.tune, size: 18), label: const Text('Pengaturan')),
            ]),
            const SizedBox(height: 16),
            Text('Waktu bermain hari ini', style: judul),
            const SizedBox(height: 6),
            Text(c.tanpaBatas ? '${c.usedMin} menit · Tanpa batas' : '${c.usedMin} dari ${c.limitMin} menit'),
            if (!c.tanpaBatas) ...[
              const SizedBox(height: 6),
              LinearProgressIndicator(
                value: (c.usedMin / c.limitMin).clamp(0.0, 1.0),
                minHeight: 8,
                borderRadius: BorderRadius.circular(4),
                color: c.usedMin >= c.limitMin ? Warna.error : Warna.ok,
              ),
            ],
            const SizedBox(height: 16),
            Text('7 hari terakhir (menit)', style: judul),
            const SizedBox(height: 8),
            WeekChart(week: report.week, limitMin: c.limitMin),
            const SizedBox(height: 16),
            Text('Statistik permainan', style: judul),
            const SizedBox(height: 4),
            _TabelStatistik(stats: report.stats),
            const SizedBox(height: 16),
            Text('Permainan terakhir', style: judul),
            const SizedBox(height: 4),
            if (report.recent.isEmpty)
              const Text('Belum ada permainan.', style: TextStyle(color: Warna.muted))
            else
              for (final g in report.recent)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    g.outcome == 'menang' ? Icons.emoji_events : g.outcome == 'kalah' ? Icons.close : Icons.handshake_outlined,
                    color: g.outcome == 'menang' ? Warna.ok : Warna.muted,
                  ),
                  title: Text('${namaGame[g.game] ?? g.game} · ${namaHasil[g.outcome] ?? g.outcome}'),
                  subtitle: Text('${g.mode == 'online' ? 'Online' : 'Lawan bot'} · skor ${g.score} · ${_tanggal(g.at)}'),
                ),
          ],
        ),
      ),
    );
  }
}

class _TabelStatistik extends StatelessWidget {
  final Map<String, GameStat> stats;
  const _TabelStatistik({required this.stats});

  @override
  Widget build(BuildContext context) {
    const kepala = TextStyle(fontWeight: FontWeight.w600, color: Warna.muted);
    Widget sel(String t, [TextStyle? s]) => Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text(t, style: s));
    return Table(
      columnWidths: const {0: FlexColumnWidth(2)},
      children: [
        TableRow(children: [sel('Game', kepala), sel('Main', kepala), sel('Menang', kepala), sel('Kalah', kepala), sel('Seri', kepala)]),
        for (final g in namaGame.keys)
          TableRow(children: [
            sel(namaGame[g]!),
            sel('${stats[g]?.main ?? 0}'),
            sel('${stats[g]?.menang ?? 0}'),
            sel('${stats[g]?.kalah ?? 0}'),
            sel('${stats[g]?.seri ?? 0}'),
          ]),
      ],
    );
  }
}

String _tanggal(DateTime d) {
  String dua(int n) => n.toString().padLeft(2, '0');
  return '${dua(d.day)}/${dua(d.month)} ${dua(d.hour)}:${dua(d.minute)}';
}
