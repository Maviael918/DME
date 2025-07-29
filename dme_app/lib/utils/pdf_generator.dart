import 'dart:io';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/widgets.dart' as pw;

class PdfGenerator {
  static Future<void> generateAndOpenFile(String fileName, List<Map<String, dynamic>> historico) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        build: (context) => [
          pw.Header(level: 0, child: pw.Text('Histórico de Saídas')),
          pw.Table.fromTextArray(
            headers: ['Data', 'Localidade', 'Nomes', 'Observação'],
            data: historico.map((item) => [
              DateTime.parse(item['data']).toLocal().toString().substring(0, 16),
              item['localidade'],
              item['nomes'],
              item['observacao'] ?? '',
            ]).toList(),
          ),
        ],
      ),
    );

    final output = await getTemporaryDirectory();
    final file = File("${output.path}/$fileName.pdf");
    await file.writeAsBytes(await pdf.save());

    OpenFile.open(file.path);
  }
}
