import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:dme_app/widgets/success_animation_overlay.dart';

class RemanejarDialog extends StatefulWidget {
  final String colaboradorAtual;
  const RemanejarDialog({super.key, required this.colaboradorAtual});

  @override
  State<RemanejarDialog> createState() => _RemanejarDialogState();
}

class _RemanejarDialogState extends State<RemanejarDialog> {
  final _formKey = GlobalKey<FormState>();
  final List<String> _todosColaboradores = ['Maviael', 'Raminho', 'Matheus', 'Isaac', 'Mikael'];
  final List<String> _localidades = ['Sede', 'Setor A', 'Setor B', 'Setor C', 'Setor D', 'Setor E', 'Setor F', 'São Domingos', 'Fazenda Nova'];
  String? _selectedColaborador;
  String? _selectedLocalidade;
  final _observacaoController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _todosColaboradores.remove(widget.colaboradorAtual);
    _selectedColaborador = _todosColaboradores.first;
    _selectedLocalidade = _localidades.first;
  }

  Future<void> _submit() async {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });

      try {
        await Supabase.instance.client.from('historico').insert({
          'nomes': _selectedColaborador,
          'localidade': _selectedLocalidade,
          'observacao': '${widget.colaboradorAtual} cedeu a vez para $_selectedColaborador. Motivo: ${_observacaoController.text}',
          'data': tz.TZDateTime.now(tz.getLocation('America/Sao_Paulo')).toIso8601String(), // Adicionado
        });

        // Trigger notification for remanejamento
        

        if (mounted) {
          SuccessAnimationOverlay.show(context, message: 'Remanejamento registrado com sucesso!');
          // Navigator.of(context).pop(); // Remove this line
        }
        // Add a delay before popping the screen to allow the animation to be seen
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            Navigator.of(context).pop();
          }
        });
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao registrar remanejamento: $e')),
          );
        }
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Remanejar Saída'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Remanejar a vez de ${widget.colaboradorAtual} para:'),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedColaborador,
                decoration: const InputDecoration(
                  labelText: 'Novo Colaborador',
                  border: OutlineInputBorder(),
                ),
                onChanged: (String? newValue) {
                  setState(() {
                    _selectedColaborador = newValue;
                  });
                },
                items: _todosColaboradores.map<DropdownMenuItem<String>>((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(value),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedLocalidade,
                decoration: const InputDecoration(
                  labelText: 'Localidade',
                  border: OutlineInputBorder(),
                ),
                onChanged: (String? newValue) {
                  setState(() {
                    _selectedLocalidade = newValue;
                  });
                },
                items: _localidades.map<DropdownMenuItem<String>>((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(value),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _observacaoController,
                decoration: const InputDecoration(
                  labelText: 'Motivo (Opcional)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _submit,
          child: _isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Salvar'),
        ),
      ],
    );
  }
}
