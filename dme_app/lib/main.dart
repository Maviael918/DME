import 'package:dme_app/home_screen.dart';
import 'package:dme_app/screens/assinatura_screen.dart';
import 'package:dme_app/termos_screen.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:dme_app/supabaseClient.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  print('Main: WidgetsFlutterBinding initialized.');

  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  );
  print('Main: Supabase initialized.');

  runApp(const MyApp());
  print('Main: MyApp started.');
}

Future<void> showNotification(String title, String body) async {
  const AndroidNotificationDetails androidPlatformChannelSpecifics = AndroidNotificationDetails(
    'your channel id', 'your channel name', channelDescription: 'your channel description',
    importance: Importance.max,
    priority: Priority.high,
    showWhen: false,
  );
  const NotificationDetails platformChannelSpecifics = NotificationDetails(android: androidPlatformChannelSpecifics);
  await flutterLocalNotificationsPlugin.show(
    0, title, body, platformChannelSpecifics, payload: 'item x');
  print('Notification shown: $title - $body');
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    print('MyApp: Building MaterialApp.');
    return MaterialApp(
      title: 'DME App',
      theme: ThemeData(
        primarySwatch: Colors.red, // Usar vermelho como base para primarySwatch
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.yellow.shade100, // Amarelo claro como cor principal
          brightness: Brightness.light,
        ).copyWith(
          primary: Colors.red.shade800, // Vermelho morango como cor primária
          onPrimary: Colors.white, // Texto branco sobre vermelho
          secondary: Colors.yellow.shade100, // Amarelo claro como cor de destaque
          onSecondary: Colors.black, // Texto preto sobre amarelo claro
          surface: Colors.yellow.shade50, // Superfície em amarelo muito claro
          background: Colors.yellow.shade50, // Fundo em amarelo muito claro
          onSurface: Colors.black, // Texto preto sobre superfície
          onBackground: Colors.black, // Texto preto sobre fundo
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.red.shade800, // AppBar vermelho morango
          foregroundColor: Colors.white, // Texto e ícones brancos na AppBar
          elevation: 4,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.yellow.shade100, // Botões elevados amarelo claro
            foregroundColor: Colors.black, // Texto preto nos botões
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            elevation: 5,
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: Colors.black, // Botões de texto preto
            textStyle: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
      ),
      home: const AuthCheck(),
    );
  }
}

class AuthCheck extends StatefulWidget {
  const AuthCheck({super.key});

  @override
  State<AuthCheck> createState() => _AuthCheckState();
}

class _AuthCheckState extends State<AuthCheck> {
  @override
  void initState() {
    super.initState();
    print('AuthCheck: initState called.');
    _redirect();
  }

  Future<void> _redirect() async {
    print('AuthCheck: _redirect started.');
    await Future.delayed(Duration.zero);
    if (!mounted) {
      print('AuthCheck: _redirect not mounted.');
      return;
    }

    final session = Supabase.instance.client.auth.currentSession;
    final user = Supabase.instance.client.auth.currentUser;

    print('AuthCheck: Session: ${session != null ? 'exists' : 'null'}, User: ${user != null ? 'exists' : 'null'}');

    if (session != null && user != null) {
      // User is logged in, check for signature
      try {
        print('AuthCheck: Checking for user signature.');
        final response = await Supabase.instance.client
            .from('user_signatures')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', ascending: false) // Order by creation date
            .limit(1); // Get only the latest one

        if (!mounted) {
          print('AuthCheck: After signature check, not mounted.');
          return;
        }

        if (response.isNotEmpty) {
          print('AuthCheck: Signature exists, navigating to HomeScreen.');
          // Signature exists, go to home
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const HomeScreen()),
          );
        } else {
          print('AuthCheck: No signature, navigating to AssinaturaScreen.');
          // No signature, go to signature screen
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const AssinaturaScreen()),
          );
        }
      } catch (e) {
        print('AuthCheck: Error verifying signature: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao verificar assinatura: $e')),
          );
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const LoginPage()),
          );
        }
      }
    } else {
      print('AuthCheck: No session, navigating to LoginPage.');
      // No session, go to login
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginPage()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    print('AuthCheck: Building widget.');
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _isLoading = false;

  Future<void> _signIn() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await Supabase.instance.client.auth.signInWithPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text.trim(),
      );
      if (mounted && response.user != null) {
        print('LoginPage: Sign-in successful, navigating to AuthCheck.');
        // Navigate back to AuthCheck to handle routing
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const AuthCheck()),
          (route) => false,
        );
      }
    } on AuthException catch (e) {
      print('LoginPage: Auth error: ${e.message}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro no login: ${e.message}')),
        );
      }
    } catch (e) {
      print('LoginPage: Unexpected error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ocorreu um erro inesperado: $e')),
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

  @override
  Widget build(BuildContext context) {
    print('LoginPage: Building widget.');
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ferramenta de Apoio Operacional'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16.0),
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(
                labelText: 'Senha',
                border: OutlineInputBorder(),
              ),
              obscureText: true,
            ),
            const SizedBox(height: 24.0),
            _isLoading
                ? const CircularProgressIndicator()
                : ElevatedButton(
                    onPressed: _signIn,
                    child: const Text('Entrar'),
                  ),
            const SizedBox(height: 16.0),
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const TermosScreen()),
                );
              },
              child: const Text('Termos de Uso'),
            ),
            const SizedBox(height: 24.0),
            const Text(
              'App Desenvolvido por Maviael Ananias',
              style: TextStyle(fontSize: 12.0, color: Colors.black, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
