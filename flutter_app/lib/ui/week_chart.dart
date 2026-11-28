import 'package:material_ui/material_ui.dart';

import '../api/models.dart';
import 'theme.dart';

const _hari = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/// Grafik batang 7 hari (menit bermain per hari), tanpa paket grafik.
class WeekChart extends StatelessWidget {
  final List<DayMinutes> week;
  final int limitMin;
  const WeekChart({super.key, required this.week, required this.limitMin});

  @override
  Widget build(BuildContext context) {
    if (week.isEmpty) return const SizedBox.shrink();
    final maks = week.map((d) => d.minutes).fold<int>(limitMin > 0 ? limitMin : 1, (a, b) => a > b ? a : b);
    return SizedBox(
      height: 140,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (var i = 0; i < week.length; i++)
            Expanded(
              child: Tooltip(
                message: '${week[i].day}: ${week[i].minutes} menit',
                child: Column(
                  children: [
                    // Batang mengisi sisa tinggi; angka dan nama hari selalu satu baris (aman di HP sempit).
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text('${week[i].minutes}', maxLines: 1, softWrap: false, style: const TextStyle(fontSize: 11, color: Warna.muted)),
                          const SizedBox(height: 2),
                          Flexible(
                            child: FractionallySizedBox(
                              heightFactor: (week[i].minutes / maks).clamp(0.02, 1.0),
                              child: Container(
                                margin: const EdgeInsets.symmetric(horizontal: 4),
                                decoration: BoxDecoration(
                                  color: i == week.length - 1 ? Warna.primary : Warna.primary.withValues(alpha: 0.45),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(labelHari(week[i].day), maxLines: 1, softWrap: false, style: const TextStyle(fontSize: 12)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

String labelHari(String isoDay) {
  final d = DateTime.tryParse(isoDay);
  return d == null ? isoDay : _hari[d.weekday - 1];
}
