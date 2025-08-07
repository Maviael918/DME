import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timezone/timezone.dart' as tz;

class ProximoDaVezService {
  static const List<String> TODOS_COLABORADORES = ['Maviael', 'Raminho', 'Matheus', 'Isaac', 'Mikael'];
static const List<String> COLABORADORES_ROTACAO = ['Maviael', 'Raminho', 'Matheus', 'Isaac'];
  static const List<String> LOCALIDADES_INVALIDAS = ['PULOU A VEZ'];

  Future<String> determinarProximo() async {
    try {
      print('Determining próximo colaborador...');
      final historico = await _getHistorico();
      print('Historico fetched for determination: ${historico.length} records');
      
      // 1. Define a lista inicial de colaboradores que podem sair
      var colaboradoresConsiderados = List<String>.from(COLABORADORES_ROTACAO);
      print('Initial colaboradores considerados: $colaboradoresConsiderados');

      // 2. Regra de Negócio: Determinar elegibilidade com base nas saídas do dia
      final hojeString = tz.TZDateTime.now(tz.getLocation('America/Sao_Paulo')).toIso8601String().substring(0, 10);
      final viagensHoje = historico.where((d) => (d['data'] as String).startsWith(hojeString) && !LOCALIDADES_INVALIDAS.contains(d['localidade'])).toList();
      print('Viagens hoje: ${viagensHoje.length}');

      final contagemViagensHoje = { for (var c in COLABORADORES_ROTACAO) c: {'sede': 0, 'outros': 0} };

      for (var registro in viagensHoje) {
        final nomes = (registro['nomes'] as String).split(',').map((n) => n.trim());
        for (var nome in nomes) {
          if (contagemViagensHoje.containsKey(nome)) {
            if (registro['localidade'] == 'Sede') {
              contagemViagensHoje[nome]!['sede'] = contagemViagensHoje[nome]!['sede']! + 1;
            } else {
              contagemViagensHoje[nome]!['outros'] = contagemViagensHoje[nome]!['outros']! + 1;
            }
          }
        }
      }
      print('Contagem de viagens hoje: $contagemViagensHoje');

      colaboradoresConsiderados.removeWhere((c) {
        final trips = contagemViagensHoje[c]!;
        return trips['sede']! >= 2 || trips['outros']! >= 1;
      });
      print('Colaboradores considerados após filtro de viagens: $colaboradoresConsiderados');

      // 3. Se todos já saíram hoje, o ciclo recomeça
      if (colaboradoresConsiderados.isEmpty) {
        print('Todos os colaboradores atingiram o limite de saídas hoje. Reiniciando o ciclo.');
        colaboradoresConsiderados = List<String>.from(COLABORADORES_ROTACAO);
      }

      // Se, mesmo após a tentativa de reinicialização, a lista estiver vazia (caso de COLABORADORES_ROTACAO ser vazia), retorna.
      if (colaboradoresConsiderados.isEmpty) {
        print('A lista de rotação está vazia. Nenhum colaborador disponível.');
        return "Ninguém disponível";
      }

      // 4. Determina a data da última viagem (não-Sede) para cada colaborador
      final ultimasViagens = { for (var nome in colaboradoresConsiderados) nome: _getUltimaViagemNaoSede(nome, historico) };
      print('Últimas viagens não-Sede: $ultimasViagens');

      // 5. Encontra o(s) colaborador(es) com a data de última viagem mais antiga
      DateTime dataMaisAntiga = tz.TZDateTime.now(tz.getLocation('America/Sao_Paulo'));
      List<String> empatadosPorData = [];

      ultimasViagens.forEach((nome, data) {
        if (data.isBefore(dataMaisAntiga)) {
          dataMaisAntiga = data;
          empatadosPorData = [nome];
        } else if (data.isAtSameMomentAs(dataMaisAntiga)) {
          empatadosPorData.add(nome);
        }
      });
      print('Empatados por data mais antiga: $empatadosPorData');

      if (empatadosPorData.isEmpty) {
        print('No collaborators found with oldest travel date.');
        return "N/A";
      } else if (empatadosPorData.length == 1) {
        print('Determined single collaborator: ${empatadosPorData.first}');
        return empatadosPorData.first;
      } else {
        // 6. Critérios de desempate
        final desempatado = _desempatar(empatadosPorData, historico);
        print('Determined collaborator after tie-breaking: $desempatado');
        return desempatado;
      }

    } catch (e) {
      print('Erro ao determinar próximo colaborador: $e');
      return "Erro";
    }
  }

  Future<List<Map<String, dynamic>>> _getHistorico() async {
    try {
      final response = await Supabase.instance.client
          .from('historico')
          .select()
          .order('data', ascending: false); // CORREÇÃO CRÍTICA ADICIONADA

      print('Supabase Historico Raw Response: $response');
      print('Supabase Historico Response: ${response.length} items');
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      print('Error fetching historico from Supabase: $e');
      rethrow;
    }
  }

  DateTime _getUltimaViagemNaoSede(String nome, List<Map<String, dynamic>> historico) {
    final registro = historico.cast<Map<String, dynamic>>().firstWhere(
      (r) => !LOCALIDADES_INVALIDAS.contains(r['localidade']) && r['localidade'] != 'Sede' && (r['nomes'] as String).split(',').map((n) => n.trim()).contains(nome),
      orElse: () => <String, dynamic>{},
    );
    return registro.isNotEmpty ? DateTime.parse(registro['data']) : DateTime.fromMillisecondsSinceEpoch(0);
  }

  String _desempatar(List<String> empatados, List<Map<String, dynamic>> historico) {
    final umAnoAtras = tz.TZDateTime.now(tz.getLocation('America/Sao_Paulo')).subtract(const Duration(days: 365));
    final historicoUltimoAno = historico.where((r) => DateTime.parse(r['data']).isAfter(umAnoAtras)).toList();

    // Desempate 1: Menor número de saídas totais
    final pontuacao = { for (var nome in empatados) nome: 0.0 };
    final contagemSede = { for (var nome in empatados) nome: 0 }; // Contagem separada para Sede

    for (var registro in historicoUltimoAno) {
      final nomes = (registro['nomes'] as String).split(',').map((n) => n.trim());
      for (var nome in nomes) {
        if (pontuacao.containsKey(nome)) {
          if (registro['localidade'] == 'Sede') {
            contagemSede[nome] = contagemSede[nome]! + 1; // Conta viagens para Sede separadamente
          } else if (!LOCALIDADES_INVALIDAS.contains(registro['localidade'])) {
            pontuacao[nome] = pontuacao[nome]! + 1;
          }
        }
      }
    }

    // Adiciona metade das viagens para Sede à pontuação geral
    contagemSede.forEach((nome, count) {
      pontuacao[nome] = pontuacao[nome]! + (count ~/ 2); // Usando divisão inteira para corresponder à web
    });

    final minSaidas = pontuacao.values.reduce((a, b) => a < b ? a : b);
    final empatadosPorRanking = empatados.where((nome) => pontuacao[nome] == minSaidas).toList();

    if (empatadosPorRanking.length == 1) {
      return empatadosPorRanking.first;
    }

    // Desempate 2: Menor número de idas à Sede (entre os que ainda estão empatados)
    final contagemSedeFinal = { for (var nome in empatadosPorRanking) nome: contagemSede[nome]! };

    final minSede = contagemSedeFinal.values.reduce((a, b) => a < b ? a : b);
    final menosIdasSede = empatadosPorRanking.where((nome) => contagemSedeFinal[nome] == minSede).toList();

    // Se ainda houver empate, retorna o primeiro
    return menosIdasSede.first;
  }
}
