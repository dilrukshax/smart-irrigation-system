# Gmail Contact Form Setup

The Contact Us form sends email through the local Node mail API in `mail-server.js`.
Do not put a Gmail password in `contact.html`, `script.js`, or `mail-config.js`.

## 1. Create the local environment file

Copy `.env.example` to `.env` inside this folder:

```bash
cd apps/website
cp .env.example .env
```

Edit `.env`:

```bash
GMAIL_USER=your.gmail.address@gmail.com
GMAIL_APP_PASSWORD=your-16-character-gmail-app-password
MAIL_TO=IT22561770@my.sliit.lk
MAIL_FROM_NAME=Adaptive Smart Irrigation Website
MAIL_SERVER_HOST=127.0.0.1
MAIL_SERVER_PORT=8011
```

Use a Gmail app password, not the normal account password.

## 2. Install and run

```bash
npm install
npm start
```

Open:

```text
http://127.0.0.1:8011/contact.html
```

The form posts to:

```text
http://127.0.0.1:8011/api/contact
```
