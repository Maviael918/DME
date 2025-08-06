import 'dart:async';
import 'package:dme_app/screens/admin_permissions_screen.dart';
import 'package:dme_app/screens/register_extra_time_screen.dart';
import 'package:dme_app/widgets/register_service_dialog.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/inicio_screen.dart';
import 'screens/historico_screen.dart';
import 'screens/analises_screen.dart';
import 'screens/perfil_screen.dart';
import 'package:dme_app/main.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  final GlobalKey<InicioScreenState> _inicioScreenKey = GlobalKey();
  StreamSubscription<List<Map<String, dynamic>>>? _historicoSubscription;

  final List<String> _appBarTitles = <String>[
    'Início',
    'Histórico de Saídas',
    'Análises',
    'Perfil',
  ];

  late final List<Widget> _widgetOptions;
  late Future<Map<String, bool>> _permissionsFuture;

  @override
  void initState() {
    super.initState();
    _widgetOptions = <Widget>[
      InicioScreen(key: _inicioScreenKey),
      const HistoricoScreen(),
      const AnalisesScreen(),
      const PerfilScreen(),
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
      print('Erro ao buscar permissão de tempo extra: $e');
    }

    if (isAdmin) {
      canRegister = true;
    }

    return {'isAdmin': isAdmin, 'canRegister': canRegister};
  }

  void _setupRealtimeListener() {
    _historicoSubscription = Supabase.instance.client
        .from('historico')
        .stream(primaryKey: ['id'])
        .listen((List<Map<String, dynamic>> data) {
      print('Realtime update received: $data');
      if (data.isNotEmpty && data.any((item) => item['id'] != null)) {
        final newItem = data.firstWhere((item) => item['id'] != null, orElse: () => {});
        if (newItem.isNotEmpty) {
          final nomes = newItem['nomes'] ?? 'Desconhecido';
          final localidade = newItem['localidade'] ?? 'Desconhecida';

          print('New item detected: $newItem');
          _inicioScreenKey.currentState?.fetchProximoColaborador();
          showNotification('Nova Saída Registrada', 'Nova saída registrada: $nomes para $localidade!');
        }
      }
    });
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  void _showRegisterServiceDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return RegisterServiceDialog(onServiceRegistered: () {
          _inicioScreenKey.currentState?.fetchProximoColaborador();
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, bool>>(
      future: _permissionsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        final bool isAdmin = snapshot.data?['isAdmin'] ?? false;
        final bool canRegisterExtraTime = snapshot.data?['canRegister'] ?? false;

        return Scaffold(
          appBar: AppBar(
            title: Text(_appBarTitles[_selectedIndex]),
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
              if (isAdmin)
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'admin') {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const AdminPermissionsScreen()),
                      ).then((_) => setState(() { _permissionsFuture = _checkUserPermissions(); }));
                    }
                  },
                  itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                    const PopupMenuItem<String>(
                      value: 'admin',
                      child: Text('Administração'),
                    ),
                  ],
                ),
            ],
          ),
          body: Column(
            children: [
              Expanded(
                child: Center(
                  child: _widgetOptions.elementAt(_selectedIndex),
                ),
              ),
              const Padding(
                padding: EdgeInsets.all(8.0),
                child: Column(
                  children: [
                    Text(
                      'App Desenvolvido por Maviael Ananias',
                      style: TextStyle(fontSize: 12.0, color: Colors.black, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'v1.1 - Correção Crítica', // VERIFICADOR DE BUILD
                      style: TextStyle(fontSize: 10.0, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          bottomNavigationBar: BottomNavigationBar(
            items: const <BottomNavigationBarItem>[
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Início'),
              BottomNavigationBarItem(icon: Icon(Icons.history), label: 'Histórico'),
              BottomNavigationBarItem(icon: Icon(Icons.bar_chart), label: 'Análises'),
              BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Perfil'),
            ],
            currentIndex: _selectedIndex,
            selectedItemColor: Theme.of(context).primaryColor,
            unselectedItemColor: Colors.grey,
            onTap: _onItemTapped,
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _historicoSubscription?.cancel();
    super.dispose();
  }
}
