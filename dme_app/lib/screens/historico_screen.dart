import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import 'package:timezone/timezone.dart' as tz;

class HistoricoScreen extends StatefulWidget {
  const HistoricoScreen({super.key});

  @override
  State<HistoricoScreen> createState() => HistoricoScreenState();
}

class HistoricoScreenState extends State<HistoricoScreen> {
  late Future<List<Map<String, dynamic>>> _historicoFuture;
  final supabase = Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    _historicoFuture = _internalFetch();
  }

  Future<void> fetchHistorico() async {
    if (mounted) {
      setState(() {
        _historicoFuture = _internalFetch();
      });
    }
  }

  Future<List<Map<String, dynamic>>> _internalFetch() async {
    try {
      final response = await supabase
          .from('historico')
          .select()
          .order('data', ascending: false);
      return List<Map<String, dynamic>>.from(response as List);
    } catch (e) {
      // Retorna uma lista vazia em caso de erro
      return [];
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: fetchHistorico,
      child: FutureBuilder<List<Map<String, dynamic>>>(
        future: _historicoFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Erro: ${snapshot.error}'));
          }
          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('Nenhum histórico encontrado.'));
          }

          final historico = snapshot.data!;

          return ListView.builder(
            itemCount: historico.length,
            itemBuilder: (context, index) {
              final item = historico[index];
              final data = DateTime.parse(item['data']).toUtc();
              final brasilia = tz.getLocation('America/Sao_Paulo');
              final dataBrasilia = tz.TZDateTime.from(data, brasilia);
              final dataFormatada = DateFormat('dd/MM/yyyy HH:mm').format(dataBrasilia);

              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: ListTile(
                  title: Text('${item['nomes']} - ${item['localidade']}'),
                  subtitle: Text('Data: $dataFormatada\nObs: ${item['observacao'] ?? 'N/A'}'),
                  isThreeLine: true,
                ),
              );
            },
          );
        },
      ),
    );
  }
}