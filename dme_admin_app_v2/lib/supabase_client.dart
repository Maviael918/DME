import 'package:supabase_flutter/supabase_flutter.dart';

final supabase = Supabase.instance.client;

// TODO: Substituir por variáveis de ambiente ou um método mais seguro em produção
const String supabaseUrl = 'https://cqtxsyzuvlucxfbyxyhp.supabase.co';
const String supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdHhzeXp1dmx1Y3hmYnl4eWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyODk1MjQsImV4cCI6MjA2Mzg2NTUyNH0.zCC23y3KGvkjAqGFCopteAk5QV4JXkLeSonIjmFK1AM';
