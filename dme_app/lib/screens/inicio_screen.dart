import 'package:dme_app/services/proximo_da_vez_service.dart';
import 'package:dme_app/widgets/register_service_dialog.dart';
import 'package:dme_app/widgets/remanejar_dialog.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import 'package:timezone/timezone.dart' as tz;

class InicioScreen extends StatefulWidget {
  const InicioScreen({super.key});

  @override
  State<InicioScreen> createState() => InicioScreenState();
}

class InicioScreenState extends State<InicioScreen> {
  final ProximoDaVezService _proximoDaVezService = ProximoDaVezService();
  String? _proximoColaborador;
  List<Map<String, dynamic>> _cards = [];
  List<Map<String, dynamic>> _historico = [];
  bool _isLoading = true;
  SupabaseClient supabase = Supabase.instance.client;
  late final RealtimeChannel _historicoChannel;
  late final RealtimeChannel _cardsChannel;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  void _initialize() {
    loadScreenData();
    // Listener para a tabela de histórico
    _historicoChannel = supabase.channel('public:historico');
    _historicoChannel.onPostgresChanges(
      event: PostgresChangeEvent.all, // Ouvir todas as mudanças
      schema: 'public',
      table: 'historico',
      callback: (payload) {
        loadScreenData();
      },
    ).subscribe();

    // Listener para a tabela de cards
    _cardsChannel = supabase.channel('public:app_cards');
    _cardsChannel.onPostgresChanges(
      event: PostgresChangeEvent.all, // Ouvir todas as mudanças
      schema: 'public',
      table: 'app_cards',
      callback: (payload) {
        loadScreenData();
      },
    ).subscribe();
  }

  @override
  void dispose() {
    supabase.removeChannel(_historicoChannel);
    supabase.removeChannel(_cardsChannel);
    super.dispose();
  }

  Future<void> loadScreenData() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
      });
    }
    try {
      // Busca os dados em paralelo
      final responses = await Future.wait([
        _proximoDaVezService.determinarProximo(),
        supabase.from('app_cards').select().eq('is_active', true).order('display_order').then((value) => value),
        supabase.from('historico').select().order('data', ascending: false).limit(4)
      ]);

      final proximo = responses[0] as String?;
      final cardsResponse = responses[1] as List<dynamic>;
      final cards = List<Map<String, dynamic>>.from(cardsResponse);
      final historicoResponse = responses[2] as List<dynamic>;
      final historico = List<Map<String, dynamic>>.from(historicoResponse);

      if (mounted) {
        setState(() {
          _proximoColaborador = proximo;
          _cards = cards;
          _historico = historico;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _proximoColaborador = "Erro ao determinar";
          _isLoading = false;
        });
      }
    }
  }

  void _showRegisterServiceDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return RegisterServiceDialog(onServiceRegistered: loadScreenData);
      },
    );
  }

  void _showRemanejarDialog() {
    if (_proximoColaborador == null || _proximoColaborador == "Ninguém disponível" || _proximoColaborador == "Erro ao determinar") {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não há colaborador para remanejar a saída.')),
      );
      return;
    }
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return RemanejarDialog(colaboradorAtual: _proximoColaborador!);
      },
    ).then((_) => loadScreenData());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: loadScreenData,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Container(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('Próximo da Vez:', style: TextStyle(fontSize: 24)),
                          Text(_proximoColaborador ?? '', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 40),
                          ElevatedButton.icon(
                            icon: const Icon(Icons.edit_calendar),
                            label: const Text('Selecionar Colaborador'),
                            onPressed: _showRegisterServiceDialog,
                            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15)),
                          ),
                          const SizedBox(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              TextButton.icon(
                                icon: const Icon(Icons.swap_horiz),
                                label: const Text('Remanejar'),
                                onPressed: _showRemanejarDialog,
                              ),
                              const SizedBox(width: 20),
                              TextButton.icon(
                                icon: const Icon(Icons.tune),
                                label: const Text('Ajustar Vez'),
                                onPressed: _showRegisterServiceDialog, // Ajustar abre o mesmo diálogo
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          const Divider(),
                        ],
                      ),
                    ),
                  ),
                  SliverToBoxAdapter(
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(16.0, 0, 16.0, 16.0),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Últimas 4 Viagens:', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final record = _historico[index];
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          elevation: 2,
                          child: ListTile(
                            leading: const Icon(Icons.history),
                            title: Text(record['nomes'] ?? ''),
                            subtitle: Text('${record['localidade'] ?? ''} - ${record['data'] != null ? DateFormat('dd/MM/yyyy HH:mm').format(tz.TZDateTime.from(DateTime.parse(record['data']), tz.getLocation('America/Sao_Paulo'))) : ''}'),
                          ),
                        );
                      },
                      childCount: _historico.length,
                    ),
                  ),
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final card = _cards[index];
                        final imageUrl = card['image_url'] as String?;
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          elevation: 4,
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (imageUrl != null && imageUrl.isNotEmpty)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8.0),
                                    child: Image.network(
                                      imageUrl,
                                      width: double.infinity,
                                      height: 150,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) => const Icon(Icons.image_not_supported, size: 50),
                                    ),
                                  ),
                                if (imageUrl != null && imageUrl.isNotEmpty)
                                  const SizedBox(height: 12),
                                Text(
                                  card['title'] ?? '',
                                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                Text(card['description'] ?? ''),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: _cards.length,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
