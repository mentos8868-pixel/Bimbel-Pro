// Bentuk data mengikuti jawaban server/accounts.js (publicChild, /api/saya, /api/laporan).

int _int(dynamic v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;
String _str(dynamic v) => v == null ? '' : '$v';

class Child {
  final int id;
  final String name;
  final String jenjang;
  final int kelas;
  final String color;
  final int limitMin;
  final int usedMin;
  final bool allowStrangers;
  final bool approveFriends;
  final String chat;
  final String? loginAnak;

  const Child({
    required this.id,
    required this.name,
    this.jenjang = '',
    this.kelas = 0,
    this.color = '#4f9cf0',
    this.limitMin = 60,
    this.usedMin = 0,
    this.allowStrangers = false,
    this.approveFriends = true,
    this.chat = 'mati',
    this.loginAnak,
  });

  factory Child.fromJson(Map<String, dynamic> j) => Child(
        id: _int(j['id']),
        name: _str(j['name']),
        jenjang: _str(j['jenjang']),
        kelas: _int(j['kelas']),
        color: j['color'] is String ? j['color'] as String : '#4f9cf0',
        limitMin: _int(j['limitMin']),
        usedMin: _int(j['usedMin']),
        allowStrangers: j['allowStrangers'] == true,
        approveFriends: j['approveFriends'] == true,
        chat: j['chat'] is String ? j['chat'] as String : 'mati',
        loginAnak: j['loginAnak'] as String?,
      );

  bool get tanpaBatas => limitMin <= 0;

  /// Sisa menit hari ini; null bila tanpa batas.
  int? get sisaMenit => tanpaBatas ? null : (limitMin - usedMin).clamp(0, limitMin);

  String get kelasLabel => kelas > 0 ? 'Kelas $kelas' : jenjang;
}

class Parent {
  final int id;
  final String name;
  final String? login;
  final bool kepala;

  const Parent({required this.id, required this.name, this.login, this.kepala = false});

  factory Parent.fromJson(Map<String, dynamic> j) =>
      Parent(id: _int(j['id']), name: _str(j['name']), login: j['login'] as String?, kepala: j['kepala'] == true);
}

class Me {
  final Parent? ortu;
  final Child? anak;
  final List<Child> children;

  const Me({this.ortu, this.anak, this.children = const []});

  factory Me.fromJson(Map<String, dynamic> j) => Me(
        ortu: j['ortu'] is Map ? Parent.fromJson(Map<String, dynamic>.from(j['ortu'] as Map)) : null,
        anak: j['anak'] is Map ? Child.fromJson(Map<String, dynamic>.from(j['anak'] as Map)) : null,
        children: (j['children'] as List? ?? const [])
            .map((c) => Child.fromJson(Map<String, dynamic>.from(c as Map)))
            .toList(),
      );
}

class DayMinutes {
  final String day; // YYYY-MM-DD (WIB)
  final int minutes;
  const DayMinutes(this.day, this.minutes);
}

class GameStat {
  final int main, menang, kalah, seri;
  const GameStat({this.main = 0, this.menang = 0, this.kalah = 0, this.seri = 0});

  factory GameStat.fromJson(Map<String, dynamic> j) =>
      GameStat(main: _int(j['main']), menang: _int(j['menang']), kalah: _int(j['kalah']), seri: _int(j['seri']));
}

class GameResult {
  final String game, mode, outcome;
  final int score;
  final DateTime at;
  const GameResult({required this.game, required this.mode, required this.outcome, required this.score, required this.at});

  factory GameResult.fromJson(Map<String, dynamic> j) => GameResult(
        game: _str(j['game']),
        mode: _str(j['mode']),
        outcome: _str(j['outcome']),
        score: _int(j['score']),
        at: DateTime.fromMillisecondsSinceEpoch(_int(j['at'])),
      );
}

class ChildReport {
  final Child child;
  final List<DayMinutes> week;
  final Map<String, GameStat> stats;
  final List<GameResult> recent;

  const ChildReport({required this.child, this.week = const [], this.stats = const {}, this.recent = const []});

  factory ChildReport.fromJson(Map<String, dynamic> j) => ChildReport(
        child: Child.fromJson(j),
        week: (j['week'] as List? ?? const [])
            .map((d) => DayMinutes(_str((d as Map)['day']), _int(d['minutes'])))
            .toList(),
        stats: (j['stats'] as Map? ?? const {}).map(
            (k, v) => MapEntry('$k', GameStat.fromJson(Map<String, dynamic>.from(v as Map)))),
        recent: (j['recent'] as List? ?? const [])
            .map((r) => GameResult.fromJson(Map<String, dynamic>.from(r as Map)))
            .toList(),
      );
}

const namaGame = {'catur': 'Catur', 'scramble': 'Scramble', 'kartu': 'Kartu Kilat'};
const namaHasil = {'menang': 'Menang', 'kalah': 'Kalah', 'seri': 'Seri'};
const pilihanChat = {'mati': 'Mati', 'siap': 'Pesan siap pakai', 'bebas': 'Teks bebas (disaring)'};
