import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NotificationService {
  // Instância do Firebase Messaging
  static final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;

  // Cliente Supabase
  static final SupabaseClient _supabase = Supabase.instance.client;

  // Função para inicializar o serviço de notificação
  static Future<void> initialize() async {
    try {
      // 1. Pedir permissão ao usuário
      final NotificationSettings settings = await _firebaseMessaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        // 2. Obter o token FCM
        final String? fcmToken = await _firebaseMessaging.getToken();

        if (fcmToken != null) {
          // 3. Salvar o token no banco de dados
          await _saveTokenToDatabase(fcmToken);
        }

        // Listener para quando o token for atualizado
        _firebaseMessaging.onTokenRefresh.listen(_saveTokenToDatabase);
      }
    } catch (e) {
      // ignore
    }
  }

  // Função para salvar o token no Supabase
  static Future<void> _saveTokenToDatabase(String token) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user != null) {
        // Usamos upsert para inserir um novo token ou atualizar um existente
        // para o mesmo dispositivo, evitando duplicatas.
        await _supabase.from('fcm_tokens').upsert({
          'user_id': user.id,
          'token': token,
        });
      } else {
      }
    } catch (e) {
      // ignore
    }
  }
}
