import 'package:dme_app/utils/pdf_generator.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AnaliseColaboradorScreen extends StatefulWidget {
  const AnaliseColaboradorScreen({super.key});

  @override
  State<AnaliseColaboradorScreen> createState() => _AnaliseColaboradorScreenState();
}

class _AnaliseColaboradorScreenState extends State<AnaliseColaboradorScreen> {
  final List<String> _todosColaboradores = ['Maviael', 'Raminho', 'Matheus', 'Isaac', 'Mikael'];
  String? _selectedColaboradorForPdf;
  bool _isLoadingPdf = false;
  bool _isLoadingData = true;
  List<Map<String, dynamic>> _historicoCompleto = [];
  Map<String, Map<String, int>> _analiseData = {};

  @override
  void initState() {
    super.initState();
    _selectedColaboradorForPdf = _todosColaboradores.first;
    _fetchAndProcessData();
  }

  Future<void> _fetchAndProcessData() async {
    setState(() {
      _isLoadingData = true;
    });
    try {
      final historico = await Supabase.instance.client
          .from('historico')
          .select()
          .order('data', ascending: false);

      _historicoCompleto = List<Map<String, dynamic>>.from(historico);
      _processAnaliseData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar dados: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingData = false;
        });
      }
    }
  }

  void _processAnaliseData() {
    final umAnoAtras = DateTime.now().subtract(const Duration(days: 365));
    final dadosFiltrados = _historicoCompleto.where((d) => DateTime.parse(d['data']).isAfter(umAnoAtras)).toList();

    final Map<String, Map<String, int>> contagem = {};
    for (var c in _todosColaboradores) {
      contagem[c] = {};
    }

    for (var registro in dadosFiltrados) {
      final nomes = (registro['nomes'] as String).split(',').map((n) => n.trim());
      final setor = registro['localidade'] as String;

      for (var nome in nomes) {
        if (contagem.containsKey(nome)) {
          contagem[nome]![setor] = (contagem[nome]![setor] ?? 0) + 1;
        }
      }
    }
    _analiseData = contagem;
  }

  Future<void> _downloadHistorico() async {
    if (_selectedColaboradorForPdf == null) return;

    setState(() {
      _isLoadingPdf = true;
    });

    try {
      final historico = await Supabase.instance.client
          .from('historico')
          .select()
          .like('nomes', '%$_selectedColaboradorForPdf%')
          .order('data', ascending: false);

      await PdfGenerator.generateAndOpenFile('historico_$_selectedColaboradorForPdf', List<Map<String, dynamic>>.from(historico));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao gerar PDF: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingPdf = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Análise por Colaborador')),
      body: _isLoadingData
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchAndProcessData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    DropdownButtonFormField<String>(
                      value: _selectedColaboradorForPdf,
                      decoration: const InputDecoration(
                        labelText: 'Colaborador para PDF',
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (String? newValue) {
                        setState(() {
                          _selectedColaboradorForPdf = newValue;
                        });
                      },
                      items: _todosColaboradores.map<DropdownMenuItem<String>>((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(value),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                    _isLoadingPdf
                        ? const CircularProgressIndicator()
                        : ElevatedButton.icon(
                            icon: const Icon(Icons.download),
                            label: const Text('Baixar Histórico em PDF'),
                            onPressed: _downloadHistorico,
                          ),
                    const SizedBox(height: 30),
                    const Text(
                      'Viagens por Colaborador e Setor (Último Ano):',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 10),
                    _buildAnaliseTable(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildAnaliseTable() {
    if (_analiseData.isEmpty) {
      return const Center(child: Text('Nenhum dado de análise disponível.'));
    }

    final List<DataRow> rows = [];
    _analiseData.forEach((colaborador, setores) {
      final sortedSetores = setores.keys.toList()..sort();
      if (sortedSetores.isNotEmpty) {
        for (int i = 0; i < sortedSetores.length; i++) {
          final setor = sortedSetores[i];
          rows.add(DataRow(cells: [
            if (i == 0) DataCell(Text(colaborador)) else const DataCell(Text('')), // Colaborador apenas na primeira linha
            DataCell(Text(setor)),
            DataCell(Text(setores[setor].toString())),
          ]));
        }
      } else {
        rows.add(DataRow(cells: [
          DataCell(Text(colaborador)),
          const DataCell(Text('Nenhuma')),
          const DataCell(Text('0')),
        ]));
      }
    });

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columns: const [
          DataColumn(label: Text('Colaborador')),
          DataColumn(label: Text('Setor')),
          DataColumn(label: Text('Viagens')),
        ],
        rows: rows,
      ),
    );
  }
}
