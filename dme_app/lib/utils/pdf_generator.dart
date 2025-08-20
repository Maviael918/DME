import 'dart:io';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:timezone/timezone.dart' as tz;
import 'package:intl/intl.dart';

class PdfGenerator {
  static Future<void> generateAndOpenFile(String fileName, List<Map<String, dynamic>> historico) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.MultiPage(
        build: (context) => [
          pw.Header(level: 0, child: pw.Text('Histórico de Saídas')),
          pw.TableHelper.fromTextArray(
            headers: ['Data', 'Localidade', 'Nomes', 'Observação'],
            data: historico.map((item) => [
              DateFormat('dd/MM/yyyy HH:mm').format(tz.TZDateTime.from(DateTime.parse(item['data']).toUtc(), tz.getLocation('America/Sao_Paulo'))),
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
