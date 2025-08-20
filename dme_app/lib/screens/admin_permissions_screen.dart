import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// Modelo para representar os dados do usuário
class AppUser {
  final String id;
  final String email;
  bool canRegisterExtraTime;

  AppUser({
    required this.id,
    required this.email,
    required this.canRegisterExtraTime,
  });
}

class AdminPermissionsScreen extends StatefulWidget {
  const AdminPermissionsScreen({super.key});

  @override
  State<AdminPermissionsScreen> createState() => _AdminPermissionsScreenState();
}

class _AdminPermissionsScreenState extends State<AdminPermissionsScreen> {
  late Future<List<AppUser>> _usersFuture;

  @override
  void initState() {
    super.initState();
    _usersFuture = _fetchUsers();
  }

  // Busca os usuários usando a função RPC do Supabase
  Future<List<AppUser>> _fetchUsers() async {
    try {
      final List<dynamic> response = await Supabase.instance.client.rpc('get_all_users');
      return response.map((user) => AppUser(
        id: user['id'],
        email: user['email'],
        canRegisterExtraTime: user['can_register_extra_time'],
      )).toList();
    } catch (e) {
      if (!mounted) return [];
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao buscar usuários: ${e.toString()}')),
      );
      return [];
    }
  }

  // Atualiza a permissão de um usuário
  Future<void> _updatePermission(AppUser user, bool newValue) async {
    try {
      await Supabase.instance.client.from('user_permissions').upsert({
        'user_id': user.id,
        'can_register_extra_time': newValue,
      }, onConflict: 'user_id');

      setState(() {
        user.canRegisterExtraTime = newValue;
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Permissão de ${user.email} atualizada.')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao atualizar permissão: ${e.toString()}')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gerenciar Permissões'),
      ),
      body: FutureBuilder<List<AppUser>>(
        future: _usersFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Erro: ${snapshot.error}'));
          }
          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text('Nenhum usuário encontrado.'));
          }

          final users = snapshot.data!;

          return ListView.builder(
            itemCount: users.length,
            itemBuilder: (context, index) {
              final user = users[index];
              // Não mostra o próprio admin na lista para evitar auto-bloqueio
              if (user.email == 'maviael2013@gmail.com') {
                return const SizedBox.shrink();
              }
              return ListTile(
                title: Text(user.email),
                trailing: Switch(
                  value: user.canRegisterExtraTime,
                  onChanged: (newValue) {
                    _updatePermission(user, newValue);
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}
