# Elementor -> Katet CRM lead ingest

This folder contains a ready-to-use PHP snippet for WordPress Code Snippets plugin.

File:
- `katet-elementor-to-crm-snippet.php`

## What it does

- Hooks into `elementor_pro/forms/new_record`.
- Captures submitted Elementor Pro form fields.
- Builds CRM payload for `channel=site`.
- Captures Yandex Metrika ClientID (`_ym_uid`), yclid, UTM tags, first landing page, referrer, and a unique form submission ID.
- Signs request with HMAC SHA-256 exactly as backend expects:
  - message: `<x-integration-timestamp>.site.<stable-json-payload>`
  - header: `x-integration-signature: sha256=<hex>`
- Sends to `POST /api/v1/integrations/events/ingest`.

## Backend prep (CRM)

Set these variables in `app/backend/.env` (or your production secret store):

```env
INTEGRATION_SITE_SECRET=<strong-shared-secret>
INTEGRATION_REQUIRE_SIGNATURES=true
```

`INTEGRATION_REQUIRE_SIGNATURES=true` is recommended for production.

## WordPress setup

1. Install and activate plugin `Code Snippets`.
2. Put the shared secret in `wp-config.php` (or another approved server-side secret store), never in the tracked snippet:

   ```php
   define('KATET_CRM_SITE_SECRET', '<same-secret-as-crm-production-env>');
   ```

3. Create a new snippet and paste `katet-elementor-to-crm-snippet.php`.
4. If needed, define `KATET_CRM_INGEST_URL` in `wp-config.php`; the checked-in snippet defaults to the production CRM URL.
5. Optional: define `KATET_CRM_FORM_NAMES_ALLOWLIST` as comma-separated Form Name values if you do not want all forms.
6. In Code Snippets, set execution to run everywhere (front + admin), then save and activate snippet.

Do not send the real secret through ordinary chat, tickets, screenshots, or logs. Use the team's password/secret manager and rotate CRM + WordPress together if exposure is suspected.

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
