import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:dme_admin_app_v2/services/proximo_da_vez_service.dart'; // New import

class AdminDashboardPage extends StatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  late Future<List<Map<String, dynamic>>> _pendingExtraTimesFuture;
  final ProximoDaVezService _proximoDaVezService = ProximoDaVezService(); // Instantiate service
  String? _proximoColaborador; // State variable for next collaborator

  @override
  void initState() {
    super.initState();
    _pendingExtraTimesFuture = _fetchPendingExtraTimes();
    _fetchProximoColaborador(); // Fetch next collaborator
  }

  Future<void> _fetchProximoColaborador() async {
    final proximo = await _proximoDaVezService.determinarProximo();
    setState(() {
      _proximoColaborador = proximo;
    });
  }

  Future<List<Map<String, dynamic>>> _fetchPendingExtraTimes() async {
    // Busca colaboradores com 4h ou mais acumuladas
    final response = await Supabase.instance.client
      .from('registros_tempo_extra')
      .select('colaborador_nome, tempo_em_minutos')
      .order('colaborador_nome');

    // Agrupa por colaborador e soma minutos
    final Map<String, int> colabMinutes = {};
    for (var item in response as List<dynamic>) {
      final nome = item['colaborador_nome'] as String? ?? '';
      final minutos = item['tempo_em_minutos'] as int? ?? 0;
      colabMinutes[nome] = (colabMinutes[nome] ?? 0) + minutos;
    }
    // Filtra só quem tem 240 minutos ou mais
    final pendentes = colabMinutes.entries
      .where((e) => e.value >= 240)
      .map((e) => {'colaborador_nome': e.key, 'tempo_em_minutos': e.value})
      .toList();
    return pendentes;
  }

  Future<void> _zerarHoras(String colaborador) async {
    final currentUser = Supabase.instance.client.auth.currentUser;
    final adminEmail = currentUser?.email ?? 'admin_desconhecido';

    try {
      // Remove todos os registros de tempo extra do colaborador
      final deleteResponse = await Supabase.instance.client
        .from('registros_tempo_extra')
        .delete()
        .eq('colaborador_nome', colaborador);

      if (deleteResponse.error != null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao zerar horas extras: ${deleteResponse.error!.message}')),
          );
        }
        return; // Stop execution if delete fails
      }

      // Add observation to historico
      final insertResponse = await Supabase.instance.client
        .from('historico')
        .insert({
          'nomes': colaborador,
          'localidade': 'Compensação de Horas Extras',
          'observacao': 'Horas extras de $colaborador compensadas por $adminEmail em ${DateTime.now().toIso8601String()}.',
          'data': DateTime.now().toIso8601String(),
        });

      if (insertResponse.error != null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao registrar compensação no histórico: ${insertResponse.error!.message}')),
          );
        }
        return; // Stop execution if insert fails
      }

      setState(() {
        _pendingExtraTimesFuture = _fetchPendingExtraTimes();
        _fetchProximoColaborador();
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Horas extras de $colaborador compensadas com sucesso!')), // Updated message
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ocorreu um erro inesperado ao compensar horas: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Admin Dashboard')), // Changed title
      body: Column( // Use Column to add the new Text widget at the top
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Próximo Colaborador para Viagem:',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white70),
                ),
                const SizedBox(height: 8),
                Text(
                  _proximoColaborador ?? 'Carregando...',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.green),
                ),
                const Divider(height: 32, color: Colors.grey),
              ],
            ),
          ),
          Expanded( // Wrap the FutureBuilder with Expanded
            child: FutureBuilder<List<Map<String, dynamic>>>(
              future: _pendingExtraTimesFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(child: Text('Erro: ${snapshot.error}'));
                }
                final pendentes = snapshot.data ?? [];
                if (pendentes.isEmpty) {
                  return const Center(child: Text('Nenhum colaborador com horas extras pendentes.'));
                }
                return ListView.builder(
                  itemCount: pendentes.length,
                  itemBuilder: (context, index) {
                    final colab = pendentes[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        title: Text(colab['colaborador_nome']),
                        subtitle: Text('Horas extras acumuladas: ${(colab['tempo_em_minutos'] / 60).toStringAsFixed(1)}h'),
                        trailing: ElevatedButton(
                          onPressed: () => _zerarHoras(colab['colaborador_nome']),
                          child: const Text('Compensar Horas'),
                        ),
                      ),
                    ); 
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
