# Amrita Nexus Localhost Setup

## 1. Install dependencies

```bash
npm install
```

## 2. Create environment file

Copy `.env.example` to `.env` and edit values if needed.

Minimum required:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/amrita_nexus
JWT_SECRET=replace_with_a_long_secret
CLIENT_URL=http://127.0.0.1:3000
SEED_DEFAULT_EVENTS=false
ADMIN_EMAILS=jahajeevanv@gmail.com
ADMIN_PASSWORD=replace_with_admin_password
```

Also configure Gmail SMTP:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_sender@gmail.com
SMTP_PASS=your_16_character_gmail_app_password
MAIL_FROM="Amrita Nexus <your_sender@gmail.com>"
```

Set `SEED_DEFAULT_EVENTS=true` only if you want starter events inserted into an empty database.

## 3. Start MongoDB

### Option A: local MongoDB

If MongoDB is installed locally:

```bash
mongod
```

If your local MongoDB service is managed by Homebrew:

```bash
brew services start mongodb-community
```

### Option B: MongoDB Atlas

Put your Atlas connection string into:

```env
MONGO_URI=your_atlas_connection_string
```

## 4. Run backend on localhost:5001

```bash
node server.js
```

Or in development mode:

```bash
npm run dev:server
```

## 5. Open frontend in browser

Run a simple local static server from the project folder:

```bash
python3 -m http.server 3000
```

Then open:

```text
http://127.0.0.1:3000
```

## 6. Authentication flow

- Students sign up with name + Gmail, receive OTP by email, verify it, then create a password.
- Returning students log in with email + password.
- Admin logs in with the email listed in `ADMIN_EMAILS` and the password in `ADMIN_PASSWORD`.

## 7. Main API endpoints

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/events`
- `POST /api/events` (admin)
- `PUT /api/events/:id` (admin)
- `DELETE /api/events/:id` (admin)
- `POST /api/register/:eventId`
- `GET /api/register/mine/list`
- `GET /api/admin/registrations`
