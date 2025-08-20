import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:dme_app/widgets/success_animation_overlay.dart';

class RegisterServiceDialog extends StatefulWidget {
  final VoidCallback onServiceRegistered;

  const RegisterServiceDialog({super.key, required this.onServiceRegistered});

  @override
  State<RegisterServiceDialog> createState() => _RegisterServiceDialogState();
}

class _RegisterServiceDialogState extends State<RegisterServiceDialog> {
  final _formKey = GlobalKey<FormState>();
  final List<String> _todosColaboradores = ['Maviael', 'Raminho', 'Matheus', 'Isaac', 'Mikael'];
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

      // Verificação de registro duplicado
      if (_selectedLocalidade != 'Sede') {
        final hoje = tz.TZDateTime.now(tz.getLocation('America/Sao_Paulo'));
        final inicioDoDia = DateTime(hoje.year, hoje.month, hoje.day).toIso8601String();

        try {
          final List<dynamic> registrosDoDia = await Supabase.instance.client
              .from('historico')
              .select('nomes')
              .gte('data', inicioDoDia)
              .eq('localidade', _selectedLocalidade!);

          if (registrosDoDia.isNotEmpty) {
            final colaboradoresJaRegistrados = <String>{};

            for (var registro in registrosDoDia) {
              final nomes = (registro['nomes'] as String).split(',').map((n) => n.trim());
              colaboradoresJaRegistrados.addAll(nomes);
            }

            final duplicados = _selectedColaboradores.intersection(colaboradoresJaRegistrados);

            if (duplicados.isNotEmpty) {
              if (!mounted) return;
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (BuildContext context) {
                  return AlertDialog(
                    title: const Text('Registro Duplicado'),
                    content: Text(
                        'O(s) colaborador(es) ${duplicados.join(', ')} já foi(ram) registrado(s) para o setor $_selectedLocalidade hoje. Deseja continuar?'),
                    actions: <Widget>[
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        child: const Text('Não'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        child: const Text('Sim'),
                      ),
                    ],
                  );
                },
              );

              if (confirmed != true) {
                return; // Cancela o registro
              }
            }
          }
        } catch (e) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao verificar registros existentes: $e')),
          );
          return;
        }
      }

      setState(() {
        _isLoading = true;
      });

      try {
        final user = Supabase.instance.client.auth.currentUser;
        final userEmail = user?.email ?? 'desconhecido';
        final observacaoFinal =
            '${_observacaoController.text} (Registrado por: $userEmail)'.trim();

        await Supabase.instance.client.from('historico').insert({
          'nomes': _selectedColaboradores.join(', '),
          'localidade': _selectedLocalidade,
          'observacao': observacaoFinal,
          'data': tz.TZDateTime.now(tz.getLocation('America/Sao_Paulo')).toIso8601String(),
        });

        // Trigger notification for service registration
        

        if (mounted) {
          SuccessAnimationOverlay.show(context, message: 'Serviço registrado com sucesso!');
          // Navigator.of(context).pop(); // Remove this line
          widget.onServiceRegistered(); // Chama o callback
        }
        // Add a delay before popping the screen to allow the animation to be seen
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            if (!mounted) return;
            Navigator.of(context).pop();
          }
        });
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
