import 'package:flutter/material.dart';

class SeparacaoMerendasMenuScreen extends StatelessWidget {
  const SeparacaoMerendasMenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Separação de Merendas')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Bem-vindo ao módulo de separação de merendas!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              icon: const Icon(Icons.upload_file),
              label: const Text('Importar arquivo Word (.docx)'),
              onPressed: () {
                // Navegar para tela de importação
                Navigator.pushNamed(context, '/importar_merendas');
              },
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              icon: const Icon(Icons.list_alt),
              label: const Text('Ver escolas e progresso'),
              onPressed: () {
                // Navegar para tela de escolas/progresso
                Navigator.pushNamed(context, '/progresso_merendas');
              },
            ),
          ],
        ),
      ),
    );
  }
}
