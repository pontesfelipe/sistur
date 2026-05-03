---
name: Versioning and Changelog
description: Strict semver policy in src/config/version.ts — new features always bump MINOR, never PATCH
type: preference
---
O projeto segue **SemVer estrito** em `src/config/version.ts`:

- **MAJOR** (x._._): mudança incompatível ou grande reformulação.
- **MINOR** (_.x._): **toda nova funcionalidade** (nova página, nova tabela com UI, novo módulo, novo fluxo, novo painel, integração nova). Reseta o PATCH para 0.
- **PATCH** (_._.x): **apenas** correção de bug, ajuste visual menor, refactor invisível, ou conclusão estritamente técnica de uma feature já contabilizada na MINOR atual.

**Regra prática antes de cada bump:** se a entrega adiciona algo que o usuário pode fazer e antes não podia → MINOR. Se apenas conserta ou poliu algo existente → PATCH.

Sempre adicionar entrada nova no topo de `VERSION_HISTORY` em português.