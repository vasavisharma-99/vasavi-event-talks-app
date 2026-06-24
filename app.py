import os
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        # Add User-Agent to avoid potential blocking
        req = urllib.request.Request(
            FEED_URL,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()

        root = ET.fromstring(xml_data)
        
        # Atom feed namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            title_text = title.text.strip() if title is not None and title.text else ""
            
            updated = entry.find('atom:updated', ns)
            updated_text = updated.text.strip() if updated is not None and updated.text else ""
            
            content = entry.find('atom:content', ns)
            content_html = content.text.strip() if content is not None and content.text else ""
            
            # Find alternate link for original release notes
            link_href = ""
            for link in entry.findall('atom:link', ns):
                rel = link.attrib.get('rel')
                if rel == 'alternate' or not rel:
                    link_href = link.attrib.get('href', '')
                    break
            
            entry_id = entry.find('atom:id', ns)
            entry_id_text = entry_id.text.strip() if entry_id is not None and entry_id.text else ""
            
            entries.append({
                'id': entry_id_text,
                'title': title_text,
                'updated': updated_text,
                'content': content_html,
                'link': link_href
            })
            
        return jsonify({
            'success': True,
            'entries': entries
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Run the Flask app on localhost, port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
