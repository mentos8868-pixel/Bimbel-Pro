import 'package:material_ui/material_ui.dart';

import 'state/app_state.dart';
import 'ui/child_home.dart';
import 'ui/login_screen.dart';
import 'ui/parent_dashboard.dart';
import 'ui/theme.dart';

class BimbelApp extends StatelessWidget {
  final AppState state;
  const BimbelApp({super.key, required this.state});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Bimbel Pro',
        debugShowCheckedModeBanner: false,
        theme: temaBimbel(),
        home: ListenableBuilder(
          listenable: state,
          builder: (context, _) => switch (state.mode) {
            Mode.loading => const Scaffold(body: Center(child: CircularProgressIndicator())),
            Mode.loggedOut => LoginScreen(state: state),
            Mode.ortu => ParentDashboard(state: state),
            Mode.anak => ChildHome(state: state),
          },
        ),
      );
}
