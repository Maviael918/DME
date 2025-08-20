import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:dme_app/screens/register_extra_time_screen.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/inicio_screen.dart';
import 'screens/historico_screen.dart';
import 'package:dme_app/screens/perfil_screen.dart';


class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  final GlobalKey<InicioScreenState> _inicioScreenKey = GlobalKey();
  final GlobalKey<HistoricoScreenState> _historicoScreenKey = GlobalKey();
  StreamSubscription<List<Map<String, dynamic>>>? _serviceRecordsSubscription;
  final AudioPlayer _audioPlayer = AudioPlayer();

  final List<String> _appBarTitles = <String>[
    'Início',
    'Histórico de Saídas',
    
    'Perfil',
    'Registrar Horas',
  ];

  late final List<Widget> _widgetOptions;
  late Future<Map<String, bool>> _permissionsFuture;

  @override
  void initState() {
    super.initState();
    _widgetOptions = <Widget>[
      InicioScreen(key: _inicioScreenKey),
      HistoricoScreen(key: _historicoScreenKey),
      
      const PerfilScreen(),
      const RegisterExtraTimeScreen(),
    ];
    _permissionsFuture = _checkUserPermissions();
    _setupRealtimeListener();
  }

  Future<Map<String, bool>> _checkUserPermissions() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return {'isAdmin': false, 'canRegister': false};

    bool isAdmin = user.email == 'maviael2013@gmail.com';
    bool canRegister = false;

    try {
      final response = await Supabase.instance.client
          .from('user_permissions')
          .select('can_register_extra_time')
          .eq('user_id', user.id)
          .maybeSingle();

      if (response != null && response['can_register_extra_time'] == true) {
        canRegister = true;
      }
    } catch (e) {
      // ignore
    }

    if (isAdmin) {
      canRegister = true;
    }

    return {'isAdmin': isAdmin, 'canRegister': canRegister};
  }

  void _setupRealtimeListener() {
    _serviceRecordsSubscription = Supabase.instance.client
        .from('historico') // CORRIGIDO: Ouvindo a tabela correta
        .stream(primaryKey: ['id'])
        .listen(
          (List<Map<String, dynamic>> data) {
            // Toca o som para qualquer novo registro
            _audioPlayer.play(AssetSource('sounds/buzina.mp3'));
            // Atualiza a tela de início para refletir a mudança
            _inicioScreenKey.currentState?.loadScreenData();
            // Atualiza a tela de histórico para refletir a mudança
            _historicoScreenKey.currentState?.fetchHistorico();
          },
          onError: (error) {
          },
        );
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  

  String _getUserNameFromEmail(String email) {
    switch (email) {
      case 'maviael2013@gmail.com':
        return 'Maviael';
      case 'matheus2409sales@gmail.com':
        return 'Matheus';
      default:
        return email;
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    final userName = user != null ? _getUserNameFromEmail(user.email!) : '';

    return FutureBuilder<Map<String, bool>>(
      future: _permissionsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final bool canRegisterExtraTime = snapshot.data?['canRegister'] ?? false;
        return Scaffold(
          appBar: AppBar(
            title: _selectedIndex == 0 && userName.isNotEmpty
                ? Row(
                    children: [
                      const Icon(Icons.home, size: 32),
                      const SizedBox(width: 10),
                      Text('Bem-vindo, $userName!'),
                    ],
                  )
                : Text(_appBarTitles[_selectedIndex]),
            centerTitle: true,
            actions: [
              if (canRegisterExtraTime)
                IconButton(
                  icon: const Icon(Icons.access_time_filled),
                  tooltip: 'Registrar Tempo Extra',
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const RegisterExtraTimeScreen()),
                    );
                  },
                ),
            ],
          ),
          body: AnimatedSwitcher(
            duration: const Duration(milliseconds: 500),
            child: _widgetOptions.elementAt(_selectedIndex),
          ),
          bottomNavigationBar: BottomNavigationBar(
            items: <BottomNavigationBarItem>[
              BottomNavigationBarItem(
                icon: const Icon(Icons.home),
                label: 'Início',
              ),
              BottomNavigationBarItem(
                icon: const Icon(Icons.history),
                label: 'Histórico',
              ),
              
              BottomNavigationBarItem(
                icon: const Icon(Icons.person),
                label: 'Perfil',
              ),
              BottomNavigationBarItem(
                icon: const Icon(Icons.access_time_filled),
                label: 'Horas',
              ),
            ],
            currentIndex: _selectedIndex,
            selectedItemColor: Colors.red.shade800,
            unselectedItemColor: Colors.grey,
            onTap: _onItemTapped,
            type: BottomNavigationBarType.fixed,
            showUnselectedLabels: true,
            backgroundColor: Colors.yellow.shade50,
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _serviceRecordsSubscription?.cancel();
    super.dispose();
  }
}