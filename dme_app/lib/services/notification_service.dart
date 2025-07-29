import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:workmanager/workmanager.dart';

const simpleTask = "simpleTask";
const lastServiceIdKey = "lastServiceId";

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static void initialize() {
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const InitializationSettings initializationSettings =
        InitializationSettings(android: initializationSettingsAndroid);
    _notificationsPlugin.initialize(initializationSettings);
  }

  static Future<bool> callbackDispatcher(String task, Map<String, dynamic>? inputData) async {
    if (task == simpleTask) {
      await Supabase.initialize(
        url: 'https://cqtxsyzuvlucxfbyxyhp.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdHhzeXp1dmx1Y3hmYnl4eWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODk1MjQsImV4cCI6MjA2Mzg2NTUyNH0.zCC23y3KGvkjAqGFCopteAk5QV4JXkLeSonIjmFK1AM',
      );

      final response = await Supabase.instance.client
          .from('service_records')
          .select('id, collaborator_name')
          .order('created_at', ascending: false)
          .limit(1)
          .single();

      if (response != null) {
        final lastServiceId = response['id'] as int;
        final prefs = await SharedPreferences.getInstance();
        final lastNotifiedId = prefs.getInt(lastServiceIdKey);

        if (lastNotifiedId != lastServiceId) {
          final collaboratorName = response['collaborator_name'] as String;
          await _showNotification(collaboratorName);
          await prefs.setInt(lastServiceIdKey, lastServiceId);
        }
      }
    }
    return Future.value(true);
  }

  static Future<void> _showNotification(String collaboratorName) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails('your channel id', 'your channel name',
            channelDescription: 'your channel description',
            importance: Importance.max,
            priority: Priority.high,
            ticker: 'ticker');
    const NotificationDetails platformChannelSpecifics =
        NotificationDetails(android: androidPlatformChannelSpecifics);
    await _notificationsPlugin.show(
        0,
        'DME App',
        '$collaboratorName saiu para serviço externo.',
        platformChannelSpecifics,
        payload: 'item x');
  }

  static void registerPeriodicTask() {
    Workmanager().registerPeriodicTask(
      "1",
      simpleTask,
      frequency: Duration(minutes: 15),
    );
  }
}