import 'package:material_ui/material_ui.dart';

// Warna diambil dari dashboard web (game/src/orangtua.css).
class Warna {
  static const bg = Color(0xFFF4F7FB);
  static const card = Color(0xFFFFFFFF);
  static const text = Color(0xFF1F2A37);
  static const muted = Color(0xFF5B6B7C);
  static const primary = Color(0xFF2F80ED);
  static const border = Color(0xFFD5DDE6);
  static const error = Color(0xFFC62828);
  static const ok = Color(0xFF27AE60);
}

ThemeData temaBimbel() {
  final scheme = ColorScheme.fromSeed(seedColor: Warna.primary, primary: Warna.primary, error: Warna.error, surface: Warna.card);
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: Warna.bg,
    appBarTheme: const AppBarTheme(backgroundColor: Warna.card, foregroundColor: Warna.text, elevation: 0, scrolledUnderElevation: 1),
    cardTheme: CardThemeData(
      color: Warna.card,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Warna.border)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      filled: true,
      fillColor: const Color(0xFFF7F9FB),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
  );
}

Color warnaDariHex(String hex) {
  final h = hex.replaceFirst('#', '');
  final v = int.tryParse(h.length == 6 ? 'FF$h' : h, radix: 16);
  return v == null ? Warna.primary : Color(v);
}
