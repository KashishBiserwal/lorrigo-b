# Backend code Lorrigo

POSTMAN Collection -> https://api.postman.com/collections/27213613-43e0c244-ee8a-4e6c-a5a6-ab5da4a9bcd7?access_key=PMAT-01HPMGD72GCHV0RPGPJ4KQ5A2Y

## Steps to start server

### Development

#### NOTE: Start the redis server before starting the application

Clone this repository and move at desired path

```bash
git clone https://github.com/Kapilrohilla/lorrigo.git
mv lorrigo ~/yourpath
```

Create .env file using .env.example

```bash
cd lorrigo/
mv .env.example .env
vim .env
```

Install dependencies and start

```bash
npm install && npm run dev
```
