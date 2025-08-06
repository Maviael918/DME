import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:workmanager/workmanager.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:intl/intl.dart';
import 'package:timezone/timezone.dart' as tz;

const simpleTask = "simpleTask";
const lastServiceIdKey = "lastServiceId";

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();
  static final AudioPlayer _audioPlayer = AudioPlayer();

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
          .select('id, collaborator_name, created_at')
          .order('created_at', ascending: false)
          .limit(1)
          .single();

      if (response != null) {
        final lastServiceId = response['id'] as int;
        final prefs = await SharedPreferences.getInstance();
        final lastNotifiedId = prefs.getInt(lastServiceIdKey);

        if (lastNotifiedId != lastServiceId) {
          final collaboratorName = response['collaborator_name'] as String;
          final createdAt = response['created_at'] as String;
          await showNotification(collaboratorName, createdAt);
          await prefs.setInt(lastServiceIdKey, lastServiceId);
        }
      }
    }
    return Future.value(true);
  }

  static Future<void> showNotification(String collaboratorName, String createdAt) async {
    final brasilia = tz.getLocation('America/Sao_Paulo');
    final dateTimeUtc = DateTime.parse(createdAt).toUtc();
    final dateTimeBrasilia = tz.TZDateTime.from(dateTimeUtc, brasilia);
    final formattedTime = DateFormat('HH:mm:ss').format(dateTimeBrasilia);
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
        '$collaboratorName saiu para serviço externo às $formattedTime.',
        platformChannelSpecifics,
        payload: 'item x');
    print('Attempting to play audio: assets/sounds/buzina.mp3');
    try {
      await _audioPlayer.play(AssetSource('sounds/buzina.mp3'));
      print('Audio playback initiated successfully.');
    } catch (e) {
      print('Error playing audio: $e');
    }
  }

  static void registerPeriodicTask() {
    Workmanager().registerPeriodicTask(
      "1",
      simpleTask,
      frequency: Duration(minutes: 15),
    );
  }
}