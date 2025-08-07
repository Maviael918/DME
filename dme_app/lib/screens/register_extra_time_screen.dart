import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:dme_app/widgets/success_animation_overlay.dart';

class RegisterExtraTimeScreen extends StatefulWidget {
  const RegisterExtraTimeScreen({super.key});

  @override
  State<RegisterExtraTimeScreen> createState() => _RegisterExtraTimeScreenState();
}

class _RegisterExtraTimeScreenState extends State<RegisterExtraTimeScreen> {
  final _formKey = GlobalKey<FormState>();
  final List<String> _colaboradores = ['Maviael', 'Raminho', 'Matheus', 'Isaac', 'Mikael'];
  String? _selectedColaborador;
  DateTime _selectedDate = tz.TZDateTime.now(tz.getLocation('America/Sao_Paulo'));
  final _minutesController = TextEditingController();
  final _observationController = TextEditingController();
  bool _isLoading = false;

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: tz.TZDateTime(tz.getLocation('America/Sao_Paulo'), 2020),
      lastDate: tz.TZDateTime(tz.getLocation('America/Sao_Paulo'), 2101),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _submit() async {
    if (_formKey.currentState!.validate()) {
      setState(() { _isLoading = true; });

      try {
        final user = Supabase.instance.client.auth.currentUser;
        await Supabase.instance.client.from('registros_tempo_extra').insert({
          'colaborador_nome': _selectedColaborador,
          'data': DateFormat('yyyy-MM-dd').format(_selectedDate),
          'tempo_em_minutos': int.parse(_minutesController.text),
          'observacao': _observationController.text,
          'registrado_por_id': user?.id,
          'registrado_por_email': user?.email,
        });

        if (mounted) {
          SuccessAnimationOverlay.show(context, message: 'Tempo extra registrado com sucesso!');
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
            SnackBar(content: Text('Erro ao registrar tempo extra: ${e.toString()}')),
          );
        }
      } finally {
        if (mounted) {
          setState(() { _isLoading = false; });
        }
      }
    }
  }

  

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Registrar Tempo Extra'),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DropdownButtonFormField<String>(
                value: _selectedColaborador,
                decoration: const InputDecoration(labelText: 'Colaborador'),
                items: _colaboradores.map((String value) {
                  return DropdownMenuItem<String>(value: value, child: Text(value));
                }).toList(),
                onChanged: (newValue) {
                  setState(() { _selectedColaborador = newValue; });
                },
                validator: (value) => value == null ? 'Selecione um colaborador' : null,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Text("Data: ${DateFormat('dd/MM/yyyy').format(_selectedDate)}"),
                  ),
                  TextButton(
                    onPressed: () => _selectDate(context),
                    child: const Text('Selecionar Data'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _minutesController,
                decoration: const InputDecoration(labelText: 'Tempo em Minutos'),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Por favor, insira os minutos';
                  }
                  if (int.tryParse(value) == null) {
                    return 'Por favor, insira um número válido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _observationController,
                decoration: const InputDecoration(labelText: 'Observação (Opcional)'),
                maxLines: 3,
              ),
              const SizedBox(height: 32),
              Center(
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submit,
                  child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('Registrar'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
