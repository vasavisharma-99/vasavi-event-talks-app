# BigQuery Release Hub 🚀

A premium, modern web application that aggregates, categorizes, and tracks the latest Google Cloud BigQuery release notes. It parses the official Atom feed, splits combined entries into distinct feature updates, and allows users to search, filter, and share updates on Twitter/X with pre-formatted and auto-truncated descriptions.

---

## ✨ Features

- **Granular Update Splitting**: Automatically parses daily Atom feed entries containing multiple announcements and formats them into individual feature/notice cards.
- **Modern Glassmorphic UI**: Deep slate/indigo theme with ambient neon glows, fully responsive grid, and smooth interactive micro-animations.
- **Search & Filters**: Debounced keyword search and category buttons (Features, Deprecations, Notices) to quickly find relevant updates.
- **Twitter/X Sharing**: Opens a custom compose modal with auto-composing text that fits Twitter's 280-character limit (with a live count indicator) and opens the X Web Intent window.
- **Live Sync**: Click "Refresh" to query the official Google Cloud feed instantly with a visual status indicator.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12, Flask
- **Frontend**: Plain HTML5, Vanilla CSS3 (Variables, Gradients, Flexbox/Grid), Vanilla JavaScript (DOMParser API, asynchronous fetch)
- **Icons**: FontAwesome v6.4

---

## 📂 Project Structure

```text
agy-cli-projects/
│
├── app.py                # Flask server and XML Atom feed parser
├── requirements.txt      # Python dependencies
├── .gitignore            # Git exclusion rules
├── README.md             # Project documentation
│
├── templates/
│   └── index.html        # HTML layout, semantic headers, compose modals
│
└── static/
    ├── css/
    │   └── style.css     # Dark-mode glassmorphic theme styling & animations
    └── js/
        └── main.js       # Client state, DOM parser, filters, tweeting logic
```

---

## 🚀 Setup & Running Locally

### 1. Prerequisites
Make sure you have **Python 3.12** installed on your system.

### 2. Install Dependencies
Navigate to the project root and install the required library:
```bash
pip install -r requirements.txt
```

### 3. Run the Development Server
Start the Flask application:
```bash
python app.py
```

By default, the server will start in debug mode at:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔒 Security & CORS Handling
The Flask backend acts as a reverse proxy, fetching and parsing the RSS feed on the server side (`urllib.request`). This avoids CORS issues that occur when requesting XML feeds directly from the browser context.
