# Projeto Evento Monteo

Projeto independente contendo apenas as páginas de evento:
- Landing page de evento
- Página de obrigado

## 🚀 Como usar

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:8080`

### Build para produção

```bash
npm run build
```

Os arquivos serão gerados na pasta `dist/`

### Preview do build

```bash
npm run preview
```

## 📁 Estrutura

```
Projeto Evento Monteo/
├── public/
│   ├── lpsicad/
│   │   └── imagens/        # Imagens do evento
│   ├── BP Sales Branca - Logo BP Sales.png
│   └── favicon.png
├── src/
│   ├── pages/
│   │   ├── EventLandingPage.tsx    # Landing page
│   │   └── EventThankYou.tsx        # Página de obrigado
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.ts
```

## ⚙️ Configurações

### Data do Evento

A data do evento está fixa no arquivo `src/pages/EventLandingPage.tsx`:

```typescript
const EVENT_DATE = new Date(2025, 10, 19, 19, 0, 0); // 19 de Novembro de 2025 às 19h
const EVENT_DATE_FORMATTED = "19 de Novembro de 2025";
```

### URL do WhatsApp

A URL do WhatsApp está fixa no arquivo `src/pages/EventThankYou.tsx`:

```typescript
const WHATSAPP_URL = 'https://wa.me/5511999999999'; // TODO: Atualizar com a URL real
```

## 🔗 Integrações

### Supabase
- **Projeto ID:** `hpjqetugksblfiojwhzh`
- **URL:** `https://hpjqetugksblfiojwhzh.supabase.co`
- Para mais informações, consulte `supabase.config.md`

### GitHub
- **Repositório:** https://github.com/eduardobestpiece/sitemonteo.git

## 📝 Notas

- Este projeto é completamente independente e pode ser movido para qualquer local
- Todas as configurações são fixas no código
- O projeto usa React, TypeScript, Vite e Tailwind CSS
- Configurações do Supabase estão documentadas em `supabase.config.md`

