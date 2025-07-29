import 'dart:async';
import 'package:dme_app/widgets/register_service_dialog.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/inicio_screen.dart';
import 'screens/historico_screen.dart';
import 'screens/analises_screen.dart';
import 'screens/perfil_screen.dart';
import 'package:dme_app/main.dart'; // Importa main.dart para acessar showNotification

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

  @override
  void initState() {
    super.initState();
    _widgetOptions = <Widget>[
      InicioScreen(key: _inicioScreenKey),
      const HistoricoScreen(),
      const AnalisesScreen(),
      const PerfilScreen(),
    ];
    _setupRealtimeListener();
  }

  void _setupRealtimeListener() {
    _historicoSubscription = Supabase.instance.client
        .from('historico')
        .stream(primaryKey: ['id'])
        .listen((List<Map<String, dynamic>> data) {
      print('Realtime update received: $data'); // Adicionado para depuração
      // Verifica se houve uma inserção (novo registro)
      if (data.isNotEmpty && data.any((item) => item['id'] != null)) {
        // Tenta encontrar o item que foi inserido (pode ser o último se for uma inserção simples)
        final newItem = data.firstWhere((item) => item['id'] != null, orElse: () => {});
        if (newItem.isNotEmpty) {
          final nomes = newItem['nomes'] ?? 'Desconhecido';
          final localidade = newItem['localidade'] ?? 'Desconhecida';

          print('New item detected: $newItem'); // Adicionado para depuração
          // Atualiza a tela de Início
          _inicioScreenKey.currentState?.fetchProximoColaborador();

          // Exibe a notificação
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
        return const RegisterServiceDialog();
      },
    ).then((_) => _inicioScreenKey.currentState?.fetchProximoColaborador()); // Atualiza depois que o diálogo é fechado
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ferramenta de Apoio Operacional'),
        centerTitle: true,
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
            child: Text(
              'App Desenvolvido por Maviael Ananias',
              style: TextStyle(fontSize: 12.0, color: Colors.black, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      floatingActionButton: _selectedIndex == 0
          ? FloatingActionButton(
              onPressed: _showRegisterServiceDialog,
              tooltip: 'Registrar Serviço',
              child: const Icon(Icons.add),
            )
          : null,
      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Início',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history),
            label: 'Histórico',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.bar_chart),
            label: 'Análises',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Perfil',
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: Theme.of(context).primaryColor,
        unselectedItemColor: Colors.grey,
        onTap: _onItemTapped,
      ),
    );
  }

  @override
  void dispose() {
    _historicoSubscription?.cancel();
    super.dispose();
  }
}
