import 'package:flutter/material.dart';
import 'analises/analise_setor_screen.dart';
import 'analises/analise_colaborador_screen.dart';

class AnalisesScreen extends StatelessWidget {
  const AnalisesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          ElevatedButton.icon(
            icon: const Icon(Icons.pie_chart),
            label: const Text('Análise de Setor'),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AnaliseSetorScreen()),
              );
            },
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            icon: const Icon(Icons.person_search),
            label: const Text('Análise por Colaborador'),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AnaliseColaboradorScreen()),
              );
            },
          ),
        ],
      ),
    );
  }
}
