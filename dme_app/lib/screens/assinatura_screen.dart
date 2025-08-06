import 'dart:convert';
import 'dart:typed_data';
import 'package:dme_app/home_screen.dart';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:signature/signature.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AssinaturaScreen extends StatefulWidget {
  const AssinaturaScreen({super.key});

  @override
  State<AssinaturaScreen> createState() => _AssinaturaScreenState();
}

class _AssinaturaScreenState extends State<AssinaturaScreen> {
  final SignatureController _controller = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );

  bool _isLoading = false;

  Future<void> _saveSignature() async {
    if (_controller.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, forneça sua assinatura.')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final Uint8List? data = await _controller.toPngBytes();
      if (data == null) {
        throw Exception('Não foi possível converter a assinatura para imagem.');
      }

      // Opcional: Redimensionar a imagem para economizar espaço
      final image = img.decodeImage(data)!;
      final resizedImage = img.copyResize(image, width: 400);
      final resizedData = img.encodePng(resizedImage);

      final String base64Image = base64Encode(resizedData);
      final userId = Supabase.instance.client.auth.currentUser!.id;

      await Supabase.instance.client.from('user_signatures').insert({
        'user_id': userId,
        'signature_image': base64Image,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Assinatura salva com sucesso!')),
        );
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const HomeScreen()),
          (route) => false,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao salvar assinatura: $e')),
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Registro de Assinatura'),
        automaticallyImplyLeading: false, // Remove o botão de voltar
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Text(
              'Para continuar, por favor, leia os termos e assine abaixo.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 20),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Signature(
                controller: _controller,
                height: 300,
                backgroundColor: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                ElevatedButton.icon(
                  icon: const Icon(Icons.clear),
                  label: const Text('Limpar'),
                  onPressed: () {
                    _controller.clear();
                  },
                ),
                ElevatedButton.icon(
                  icon: const Icon(Icons.save),
                  label: const Text('Salvar'),
                  onPressed: _isLoading ? null : _saveSignature,
                ),
              ],
            ),
            if (_isLoading) const Padding(
              padding: EdgeInsets.only(top: 16.0),
              child: CircularProgressIndicator(),
            )
          ],
        ),
      ),
    );
  }
}
