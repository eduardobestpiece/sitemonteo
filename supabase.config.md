# Configuração Supabase

## Projeto ID
**ID do Projeto:** `hpjqetugksblfiojwhzh`

## URL do Projeto
**URL:** `https://hpjqetugksblfiojwhzh.supabase.co`

## Como obter as chaves de API

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione o projeto com ID: `hpjqetugksblfiojwhzh`
3. Vá em **Settings** > **API**
4. Copie as seguintes informações:
   - **Project URL** (URL do projeto)
   - **anon/public key** (Chave pública)
   - **service_role key** (Chave de serviço - apenas para uso no backend)

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com:

```
VITE_SUPABASE_PROJECT_ID=hpjqetugksblfiojwhzh
VITE_SUPABASE_URL=https://hpjqetugksblfiojwhzh.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

**Nota:** O arquivo `.env` está no `.gitignore` e não será commitado no repositório por questões de segurança.

