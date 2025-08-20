import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:intl/intl.dart';

class AnaliseSetorScreen extends StatefulWidget {
  const AnaliseSetorScreen({super.key});

  @override
  State<AnaliseSetorScreen> createState() => _AnaliseSetorScreenState();
}

class _AnaliseSetorScreenState extends State<AnaliseSetorScreen> {
  List<dynamic> _historicoCompleto = [];
  bool _isLoading = true;

  final List<String> _colaboradoresRotacao = ['Maviael', 'Raminho', 'Matheus', 'Isaac'];
  final List<String> _localidadesInvalidas = ['PULOU A VEZ'];

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
    });
    try {
      final response = await Supabase.instance.client
          .from('historico')
          .select()
          .order('data', ascending: false);
      setState(() {
        _historicoCompleto = response;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar dados: $e')),
        );
      }
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Análise de Setor: São Domingos')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildUltimosHistoricos(),
                    const Divider(height: 40, thickness: 1),
                    _buildSugestaoEquipe(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildUltimosHistoricos() {
    final historicoSetor = _historicoCompleto.where((d) => d['localidade'] == 'São Domingos').toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Últimos 3 Históricos do Setor',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        if (historicoSetor.isEmpty)
          const Text('Nenhum registro para este setor.')
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: historicoSetor.length > 3 ? 3 : historicoSetor.length,
            itemBuilder: (context, index) {
              final item = historicoSetor[index];
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4.0),
                child: Text(
                  '[${DateFormat('dd/MM/yyyy').format(tz.TZDateTime.from(DateTime.parse(item['data']).toUtc(), tz.getLocation('America/Sao_Paulo')))}] - ${item['nomes']}',
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildSugestaoEquipe() {
    final historicoSetor = _historicoCompleto.where((d) => d['localidade'] == 'São Domingos').toList();

    String sugestaoEquipe = 'N/A';
    String justificativa = 'Sem dados para gerar sugestão.';

    if (historicoSetor.isNotEmpty) {
      final nomesUltimaVisita = (historicoSetor[0]['nomes'] as String).split(',').map((n) => n.trim().toLowerCase()).toList();
      final colaboradoresElegiveis = _colaboradoresRotacao.where((c) => !nomesUltimaVisita.contains(c.toLowerCase())).toList();

      if (colaboradoresElegiveis.length >= 2) {
        final Map<String, int> contagemVisitasSetor = {};
        for (var nome in colaboradoresElegiveis) {
          contagemVisitasSetor[nome] = 0;
        }

        for (var registro in historicoSetor) {
          if (registro['nomes'] != null && registro['nomes'] is String) {
            (registro['nomes'] as String).split(',').forEach((nome) {
              final officialNome = colaboradoresElegiveis.firstWhere(
                (element) => element.toLowerCase() == nome.trim().toLowerCase(),
                orElse: () => '',
              );
              if (officialNome.isNotEmpty) {
                contagemVisitasSetor[officialNome] = (contagemVisitasSetor[officialNome] ?? 0) + 1;
              }
            });
          }
        }

        final Map<String, int> contagemGeral = {};
        for (var nome in colaboradoresElegiveis) {
          contagemGeral[nome] = 0;
        }

        _historicoCompleto.where((d) => !_localidadesInvalidas.contains(d['localidade'])).forEach((registro) {
          if (registro['nomes'] != null && registro['nomes'] is String) {
            (registro['nomes'] as String).split(',').forEach((nome) {
              final officialNome = colaboradoresElegiveis.firstWhere(
                (element) => element.toLowerCase() == nome.trim().toLowerCase(),
                orElse: () => '',
              );
              if (officialNome.isNotEmpty) {
                contagemGeral[officialNome] = (contagemGeral[officialNome] ?? 0) + 1;
              }
            });
          }
        });

        final scores = colaboradoresElegiveis.map((nome) => {
              'nome': nome,
              'visitasSetor': contagemVisitasSetor[nome] ?? 0,
              'saidasGerais': contagemGeral[nome] ?? 0,
            }).toList();

        scores.sort((a, b) {
          if (a['visitasSetor'] != b['visitasSetor']) {
            return (a['visitasSetor'] as int).compareTo(b['visitasSetor'] as int);
          }
          return (a['saidasGerais'] as int).compareTo(b['saidasGerais'] as int);
        });

        if (scores.length >= 2) {
          final duplaSugerida = [scores[0]['nome'], scores[1]['nome']];
          sugestaoEquipe = duplaSugerida.join(' e ');
          justificativa = 'Sugestão baseada no menor número de visitas ao setor e, como critério de desempate, o menor número de saídas gerais.';
        } else {
          justificativa = 'Não há colaboradores elegíveis suficientes para formar uma nova dupla.';
        }
      } else {
        justificativa = 'Não há colaboradores elegíveis suficientes para formar uma nova dupla.';
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Sugestão de Equipe',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        Center(
          child: Text(
            sugestaoEquipe,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          justificativa,
          style: const TextStyle(fontSize: 14, fontStyle: FontStyle.italic),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
