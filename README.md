# Raízes & Legado

Arquivo genealógico público da família Silva–Teixeira, disponibilizado por GitHub Pages.

## Dados e atualização contínua

A fonte de dados publicada está em `data/familia.json`. A página `index.html` lê este ficheiro e desenha as cinco gerações, permitindo pesquisar e filtrar os ramos familiares. Para adicionar pessoas, atribuir IDs estáveis e declarar as ligações no array `relations`, com referências em `sources`. As alterações em `main` desencadeiam validação e publicação em `.github/workflows/pages.yml`.

## Ativação GitHub Pages

`Settings → Pages → Build and deployment → Source: GitHub Actions`. Depois, o workflow publicado na pasta `.github/workflows` pode realizar os deploys automaticamente. O URL esperado será `https://luisftsilva.github.io/Ra-zes-Legado/` depois de a plataforma confirmar a publicação.

## Privacidade

O repositório e o alojamento Pages são públicos. A versão publicada é minimizada: omite identidades e datas de familiares vivos e informações sensíveis ou filiações hipotéticas. Guardar provas, documentos, mensagens familiares e versões integrais em arquivo privado separado. `noindex` não é uma proteção de acesso.

## Estado das fontes

Os vínculos genealógicos são, nesta fase, relatos familiares sujeitos a confirmação através de assentos de nascimento, casamento, batismo e óbito. Pessoas homónimas, como as duas Teresa de Jesus, permanecem entidades distintas.
