import 'package:dme_app/widgets/custom_progress_bar.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timezone/timezone.dart' as tz;

class RegisterExtraTimeScreen extends StatefulWidget {
  const RegisterExtraTimeScreen({super.key});

  @override
  State<RegisterExtraTimeScreen> createState() => _RegisterExtraTimeScreenState();
}

class _RegisterExtraTimeScreenState extends State<RegisterExtraTimeScreen> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedColaborador;
  DateTime _selectedDate = tz.TZDateTime.now(tz.getLocation('America/Sao_Paulo'));
  final _minutesController = TextEditingController();
  final _observationController = TextEditingController();
  bool _isLoading = false;
  bool _isAdmin = false;
  String? _userName;
  int _totalMinutes = 0;

  @override
  void initState() {
    super.initState();
    _checkUserPermissions().then((_) {
      _selectedColaborador = _userName;
      _fetchTotalExtraTime(_selectedColaborador);
    });
  }

  Future<void> _fetchTotalExtraTime([String? collaboratorName]) async {
    final user = Supabase.instance.client.auth.currentUser;
    final targetColaborador = collaboratorName ?? _selectedColaborador ?? _getUserNameFromEmail(user?.email ?? '');

    if (targetColaborador.isEmpty) {
      return;
    }

    try {
      final response = await Supabase.instance.client
          .from('registros_tempo_extra')
          .select('tempo_em_minutos')
          .eq('colaborador_nome', targetColaborador); // Filter by selected collaborator

      if (response.isNotEmpty) {
        final totalMinutes = response.fold<int>(0, (sum, item) => sum + (item['tempo_em_minutos'] as int));
        if (mounted) {
          setState(() {
            _totalMinutes = totalMinutes;
          });
        }
        if (totalMinutes >= 240) {
          _sendFourHourAlert();
        }
      } else {
        if (mounted) {
          setState(() {
            _totalMinutes = 0; // Reset if no records found for the selected collaborator
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  Future<void> _sendFourHourAlert() async {
    if (mounted) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Limite de 4 Horas Atingido'),
          content: Text('Você acumulou 4 horas de tempo extra. Uma notificação foi enviada para o aplicativo do administrador.'), // Updated message
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }

    try {
      // Send email (keeping for now as per previous decision)
      await Supabase.instance.client.functions.invoke(
        'send_email',
        body: {
          'to': 'maviael2013@gmail.com',
          'subject': 'Alerta de 4 Horas de Tempo Extra',
          'html': 'O colaborador $_userName atingiu 4 horas de tempo extra acumulado.',
        },
      );

      // Get admin device token
      final adminUserResponse = await Supabase.instance.client
          .from('fcm_tokens') // Assuming fcm_tokens table stores device tokens
          .select('token')
          .eq('user_id', 'maviael2013@gmail.com') // Assuming user_id is email for admin
          .maybeSingle();

      if (adminUserResponse != null && adminUserResponse['token'] != null) {
        final adminDeviceToken = adminUserResponse['token'];

        // Send push notification
        await Supabase.instance.client.functions.invoke(
          'send_push_notification',
          body: {
            'token': adminDeviceToken,
            'title': 'Alerta de Horas Extras',
            'body': 'O colaborador $_userName atingiu 4 horas de tempo extra acumulado. Por favor, verifique no app.',
          },
        );
      }
    } catch (e) {
      // ignore
    }
  }

  String _getUserNameFromEmail(String email) {
    switch (email) {
      case 'maviael2013@gmail.com':
        return 'Maviael';
      case 'matheus2409sales@gmail.com':
        return 'Matheus';
      default:
        return email;
    }
  }

  Future<void> _checkUserPermissions() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    if (mounted) {
      setState(() {
        _userName = _getUserNameFromEmail(user.email!);
        _selectedColaborador = _userName;
      });
    }

    if (user.email == 'maviael2013@gmail.com') {
      if (mounted) {
        setState(() {
          _isAdmin = true;
        });
      }
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: tz.TZDateTime(tz.getLocation('America/Sao_Paulo'), 2020),
      lastDate: tz.TZDateTime(tz.getLocation('America/Sao_Paulo'), 2101),
    );
    if (picked != null && picked != _selectedDate) {
      if (mounted) {
        setState(() {
          _selectedDate = picked;
        });
      }
    }
  }

  Future<void> _submit() async {
    if (_formKey.currentState!.validate()) {
      if (mounted) {
        setState(() { _isLoading = true; });
      }

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
          showDialog(
            context: context,
            builder: (_) => AlertDialog(
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Image.asset('assets/icons/result page success motion design.gif', width: 120, height: 120),
                  const SizedBox(height: 10),
                  const Text('Tempo extra registrado com sucesso!', style: TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          );
          await _fetchTotalExtraTime();
          _minutesController.clear();
          _observationController.clear();
          _sendNotificationToAdmin();
        }
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

  Future<void> _sendNotificationToAdmin() async {
    try {
      final adminUserResponse = await Supabase.instance.client
          .from('profiles')
          .select('device_token')
          .eq('email', 'maviael2013@gmail.com')
          .single();

      if (adminUserResponse['device_token'] != null) {
        final adminDeviceToken = adminUserResponse['device_token'];

        await Supabase.instance.client.functions.invoke(
          'send_push_notification',
          body: {
            'token': adminDeviceToken,
            'title': 'Novo Registro de Tempo Extra',
            'body': 'O colaborador $_selectedColaborador registrou um novo tempo extra.',
          },
        );
      } else {
      }
    } catch (e) {
      // ignore
    }
  }

  String _formatDuration(int totalMinutes) {
    if (totalMinutes == 0) {
      return '0m';
    }
    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;

    final parts = <String>[];
    if (hours > 0) {
      parts.add('${hours}h');
    }
    if (minutes > 0) {
      parts.add('${minutes}m');
    }
    return parts.join(' ');
  }

  Future<void> _backupData() async {
    final shouldBackup = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Backup'),
        content: const Text('Isso enviará um backup de todos os seus registros para o seu e-mail. Deseja continuar?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );

    if (shouldBackup == true) {
      if (mounted) {
        setState(() { _isLoading = true; });
      }
      try {
        final historicoResponse = await Supabase.instance.client.from('historico').select();
        final tempoExtraResponse = await Supabase.instance.client.from('registros_tempo_extra').select();

        final csvData = _generateCsv([...historicoResponse, ...tempoExtraResponse]);

        final user = Supabase.instance.client.auth.currentUser;
        if (user != null) {
          await Supabase.instance.client.functions.invoke(
            'send_email_attachment',
            body: {
              'to': user.email,
              'subject': 'Backup de Dados do App DME',
              'html': 'Em anexo está o backup de seus dados.',
              'attachmentName': 'backup_dme_${DateFormat('yyyy_MM_dd').format(DateTime.now())}.csv',
              'attachmentContent': csvData,
            },
          );
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Backup enviado para o seu e-mail com sucesso!'))            );
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao gerar backup: ${e.toString()}')),
          );
        }
      } finally {
        if (mounted) {
          setState(() { _isLoading = false; });
        }
      }
    }
  }

  String _generateCsv(List<Map<String, dynamic>> data) {
    if (data.isEmpty) {
      return '';
    }
    final headers = data.first.keys.join(',');
    final rows = data.map((row) {
      return row.values.map((value) {
        if (value.toString().contains(',')) {
          return '"$value"';
        }
        return value;
      }).join(',');
    });
    return '$headers\n${rows.join('\n')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Meus Tempo Adicional'),
        actions: [
          IconButton(
            icon: const Icon(Icons.backup),
            onPressed: _backupData,
            tooltip: 'Fazer Backup',
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                initialValue: _selectedColaborador ?? '',
                decoration: const InputDecoration(labelText: 'Colaborador'),
                enabled: false,
              ),
              const SizedBox(height: 16),
              Text('Horas Acumuladas: ${_formatDuration(_totalMinutes)}'),
              const SizedBox(height: 8),
              CustomProgressBar(
                progress: (_totalMinutes / (4 * 60)).clamp(0.0, 1.0),
                label: '${_formatDuration(_totalMinutes)} / 4h',
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