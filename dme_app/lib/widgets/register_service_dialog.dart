import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class RegisterServiceDialog extends StatefulWidget {
  const RegisterServiceDialog({super.key});

  @override
  State<RegisterServiceDialog> createState() => _RegisterServiceDialogState();
}

class _RegisterServiceDialogState extends State<RegisterServiceDialog> {
  final _formKey = GlobalKey<FormState>();
  final List<String> _todosColaboradores = ['Maviael', 'Raminho', 'Bruninho', 'Matheus', 'Isaac', 'Mikael'];
  final List<String> _localidades = ['Sede', 'Setor A', 'Setor B', 'Setor C', 'Setor D', 'Setor E', 'Setor F', 'São Domingos', 'Fazenda Nova'];
  
  final Set<String> _selectedColaboradores = {};
  String? _selectedLocalidade;
  final _observacaoController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _selectedLocalidade = _localidades.first;
  }

  Future<void> _submit() async {
    if (_formKey.currentState!.validate()) {
      if (_selectedColaboradores.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Selecione pelo menos um colaborador.')),
        );
        return;
      }

      setState(() {
        _isLoading = true;
      });

      try {
        await Supabase.instance.client.from('historico').insert({
          'nomes': _selectedColaboradores.join(', '),
          'localidade': _selectedLocalidade,
          'observacao': _observacaoController.text,
          'data': DateTime.now().toIso8601String(), // Adicionado
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Serviço registrado com sucesso!')),
          );
          Navigator.of(context).pop(); // Close dialog
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao registrar serviço: $e')),
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
      title: const Text('Registrar Serviço Externo'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Selecione os colaboradores:'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8.0,
                children: _todosColaboradores.map((colaborador) {
                  final isSelected = _selectedColaboradores.contains(colaborador);
                  return FilterChip(
                    label: Text(colaborador),
                    selected: isSelected,
                    onSelected: (bool selected) {
                      setState(() {
                        if (selected) {
                          _selectedColaboradores.add(colaborador);
                        } else {
                          _selectedColaboradores.remove(colaborador);
                        }
                      });
                    },
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
                  labelText: 'Observações (Opcional)',
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
