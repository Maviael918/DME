from flask import Flask, request, jsonify
import io
# from docx import Document # Will be used later

app = Flask(__name__)

@app.route('/process_docx', methods=['POST'])
def process_docx():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        file_content = file.read()
        
        return jsonify({
            "status": "success",
            "message": "Docx file received and processed (placeholder).",
            "extracted_data": {
                "school_name": "Escola Placeholder",
                "products": [
                    {"name": "Produto Placeholder 1", "quantity": 10},
                    {"name": "Produto Placeholder 2", "quantity": 5}
                ]
            }
        }), 200
    
    return jsonify({"error": "Something went wrong"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)