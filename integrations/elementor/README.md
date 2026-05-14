# Elementor -> Katet CRM lead ingest

This folder contains a ready-to-use PHP snippet for WordPress Code Snippets plugin.

File:
- `katet-elementor-to-crm-snippet.php`

## What it does

- Hooks into `elementor_pro/forms/new_record`.
- Captures submitted Elementor Pro form fields.
- Builds CRM payload for `channel=site`.
- Signs request with HMAC SHA-256 exactly as backend expects:
  - message: `<x-integration-timestamp>.site.<stable-json-payload>`
  - header: `x-integration-signature: sha256=<hex>`
- Sends to `POST /api/v1/integrations/events/ingest`.

## Backend prep (CRM)

Set these variables in `app/backend/.env` (or your production secret store):

```env
INTEGRATION_SITE_SECRET=super-strong-shared-secret
INTEGRATION_REQUIRE_SIGNATURES=true
```

`INTEGRATION_REQUIRE_SIGNATURES=true` is recommended for production.

## WordPress setup

1. Install and activate plugin `Code Snippets`.
2. Create a new snippet and paste `katet-elementor-to-crm-snippet.php`.
3. Edit constants at the top of the snippet:
   - `KATET_CRM_INGEST_URL`
   - `KATET_CRM_SITE_SECRET`
4. Optional: set `KATET_CRM_FORM_NAMES_ALLOWLIST` to comma-separated Form Name values if you do not want all forms.
5. In Code Snippets, set execution to run everywhere (front + admin), then save and activate snippet.

Important for Elementor Actions After Submit:

- You do not need Elementor built-in `Webhook` action for this integration.
- The snippet sends data itself from the `elementor_pro/forms/new_record` hook.
- If backend requires signatures, unsigned Elementor Webhook requests will be rejected.

## Field mapping behavior

The snippet auto-detects values by common field ids/titles:

- phone: `phone`, `tel`, `mobile`, `whatsapp`
- name: `name`, `full_name`, `contact_name`
- company: `company`, `organization`
- equipment: `equipment`, `machine`, `service`
- address: `address`, `location`
- comment: `comment`, `message`, `note`
- date: `requested_date`, `preferred_date`, `date`
- urgent: `urgent`, `asap`, `priority`

If name is missing, it falls back to `Website lead: <form name>`.
If phone is missing, event is skipped (CRM requires phone).

## Validation checklist

1. Submit any Elementor form with phone field.
2. In CRM, check new lead in `/leads`.
3. As admin, check event in `/admin/integrations` with status `processed`.
4. If needed, set `KATET_CRM_DEBUG_LOG=true` and inspect PHP error log.
