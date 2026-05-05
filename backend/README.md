# Sparrow Food Backend

Backend server for handling email functionality.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the backend folder with:
```
EMAIL_API_KEY=your-sendgrid-api-key
CONTACT_EMAIL=contact@sparrowfood.com
PORT=5000
```

### 3. SendGrid Setup
- Create a SendGrid account
- Add and verify your sender email address or domain
- Create an API key with `Mail Send` permissions
- Use that key in `.env` as `EMAIL_API_KEY`

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
