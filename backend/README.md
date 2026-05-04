# Sparrow Foods Backend

Backend server for handling email functionality.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the backend folder with:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
CONTACT_EMAIL=your-email@gmail.com
PORT=5000
```

### 3. Gmail Setup (if using Gmail)
- Enable 2-Factor Authentication on your Gmail account
- Go to Google Account → Security → App passwords
- Generate an App Password for Mail
- Use this 16-character password in `.env` as `EMAIL_PASSWORD`

### 4. Start the Backend
```bash
npm start          # Production
npm run dev        # Development (with nodemon)
```

### 5. Test Email Endpoint
```bash
curl -X POST http://localhost:5000/api/email/send-price-list \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## API Endpoints

### Send Price List
- **POST** `/api/email/send-price-list`
- Body: `{ "email": "user@example.com" }`

### Send Contact Message
- **POST** `/api/email/send-contact`
- Body: `{ "name": "John", "email": "john@example.com", "message": "Hello" }`

### Health Check
- **GET** `/health`
