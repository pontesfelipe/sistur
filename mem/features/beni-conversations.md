---
name: Professor Beni conversations
description: Beni folders/projects, per-conversation routes, sharing (link/Word/email) and attachment relevance triage
type: feature
---
- Folders (beni_folders) with optional instructions injected into the system prompt; conversations (beni_conversations) at /professor-beni/c/:id.
- Share: public read-only /beni/compartilhado/:token via RPC get_shared_beni_conversation; Word export; e-mail up to 5 recipients (custom-message template).
- Attachments (bucket beni-attachments, 10 MB): triaged for tourism relevance BEFORE quota debit; irrelevant → polite refusal, no credit consumed.
