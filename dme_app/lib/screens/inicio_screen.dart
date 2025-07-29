import 'package:dme_app/services/proximo_da_vez_service.dart';
import 'package:dme_app/widgets/register_service_dialog.dart';
import 'package:dme_app/widgets/remanejar_dialog.dart';
import 'package:flutter/material.dart';

class InicioScreen extends StatefulWidget {
  const InicioScreen({super.key});

  @override
  State<InicioScreen> createState() => InicioScreenState();
}

class InicioScreenState extends State<InicioScreen> {
  final ProximoDaVezService _proximoDaVezService = ProximoDaVezService();
  String? _proximoColaborador;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    fetchProximoColaborador(); // Renomeado para ser público
  }

  Future<void> fetchProximoColaborador() async { // Tornada pública
    setState(() {
      _isLoading = true;
    });
    try {
      print('Fetching próximo colaborador...'); // Adicionado para depuração
      final proximo = await _proximoDaVezService.determinarProximo();
      setState(() {
        _proximoColaborador = proximo;
        _isLoading = false;
      });
      print('Próximo colaborador fetched: $_proximoColaborador'); // Adicionado para depuração
    } catch (e) {
      setState(() {
        _proximoColaborador = "Erro ao determinar";
        _isLoading = false;
      });
      print('Error fetching próximo colaborador: $e'); // Adicionado para depuração
    }
  }

  void _showRegisterServiceDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return const RegisterServiceDialog();
      },
    ).then((_) => fetchProximoColaborador()); // Atualiza depois que o diálogo é fechado
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
    ).then((_) => fetchProximoColaborador()); // Atualiza depois que o diálogo é fechado
  }

  void _showAjustarDialog() {
     // "Ajustar" simplesmente abre o diálogo de registro sem pré-seleção
    _showRegisterServiceDialog();
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: fetchProximoColaborador,
        child: Center(
          child: _isLoading
              ? const CircularProgressIndicator()
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Próximo da Vez:', style: TextStyle(fontSize: 24)),
                    Text(_proximoColaborador ?? '', style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 40),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.edit_calendar),
                      label: const Text('Marcar Saída'),
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
                          onPressed: _showAjustarDialog,
                        ),
                      ],
                    )
                  ],
                ),
        ),
      ),
    );
  }
}
