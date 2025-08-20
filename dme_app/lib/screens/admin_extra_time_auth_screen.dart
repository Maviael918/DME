import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AdminExtraTimeAuthScreen extends StatefulWidget {
  const AdminExtraTimeAuthScreen({super.key});

  @override
  State<AdminExtraTimeAuthScreen> createState() => _AdminExtraTimeAuthScreenState();
}

class _AdminExtraTimeAuthScreenState extends State<AdminExtraTimeAuthScreen> {
  late Future<List<Map<String, dynamic>>> _pendingExtraTimesFuture;

  @override
  void initState() {
    super.initState();
    _pendingExtraTimesFuture = _fetchPendingExtraTimes();
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
    // Remove todos os registros de tempo extra do colaborador
    await Supabase.instance.client
      .from('registros_tempo_extra')
      .delete()
      .eq('colaborador_nome', colaborador);
    setState(() {
      _pendingExtraTimesFuture = _fetchPendingExtraTimes();
    });
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Horas extras de $colaborador zeradas!')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Autenticar Horas Extras Pendentes')),
      body: FutureBuilder<List<Map<String, dynamic>>>(
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
                    child: const Text('Ciente / Aceitar'),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
