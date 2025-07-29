import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class HistoricoScreen extends StatefulWidget {
  const HistoricoScreen({super.key});

  @override
  State<HistoricoScreen> createState() => _HistoricoScreenState();
}

class _HistoricoScreenState extends State<HistoricoScreen> {
  late final Future<List<dynamic>> _futureHistorico;

  @override
  void initState() {
    super.initState();
    _futureHistorico = _fetchHistorico();
  }

  Future<List<dynamic>> _fetchHistorico() async {
    try {
      final response = await Supabase.instance.client
          .from('historico')
          .select()
          .order('data', ascending: false);
      print('HistoricoScreen: Fetched ${response.length} items');
      return response as List<dynamic>;
    } catch (e) {
      print('HistoricoScreen: Error fetching historico: $e');
      // Exibir um erro na tela se a busca falhar
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar histórico: $e')),
        );
      }
      return []; // Retorna uma lista vazia em caso de erro
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _futureHistorico,
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
            return Card(
              margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: ListTile(
                title: Text('Colaboradores: ${item['nomes']}'),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Localidade: ${item['localidade']}'),
                    Text('Data: ${DateTime.parse(item['data']).toLocal().toString().substring(0, 16)}'),
                    if (item['observacao'] != null && item['observacao'].isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 4.0),
                        child: Text('Obs: ${item['observacao']}'),
                      ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
