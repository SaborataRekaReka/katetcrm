<?php
/**
 * Katet CRM <- Elementor Pro forms bridge.
 *
 * Install this as a Code Snippets snippet in WordPress and set:
 * - KATET_CRM_INGEST_URL
 * - KATET_CRM_SITE_SECRET
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('KATET_CRM_INGEST_URL')) {
    define('KATET_CRM_INGEST_URL', 'https://crm.example.com/api/v1/integrations/events/ingest');
}

if (!defined('KATET_CRM_SITE_SECRET')) {
    define('KATET_CRM_SITE_SECRET', 'replace-with-integration-site-secret');
}

if (!defined('KATET_CRM_FORM_NAMES_ALLOWLIST')) {
    // Comma-separated names from Elementor Form Name; keep empty to send all forms.
    define('KATET_CRM_FORM_NAMES_ALLOWLIST', '');
}

if (!defined('KATET_CRM_HTTP_TIMEOUT_SEC')) {
    define('KATET_CRM_HTTP_TIMEOUT_SEC', 10);
}

if (!defined('KATET_CRM_DEBUG_LOG')) {
    define('KATET_CRM_DEBUG_LOG', false);
}

if (!has_action('elementor_pro/forms/new_record', 'katet_crm_handle_elementor_record')) {
    add_action('elementor_pro/forms/new_record', 'katet_crm_handle_elementor_record', 10, 2);
}

if (!function_exists('katet_crm_handle_elementor_record')) {
    function katet_crm_handle_elementor_record($record, $handler)
    {
        unset($handler);

        $secret = trim((string) KATET_CRM_SITE_SECRET);
        $ingestUrl = trim((string) KATET_CRM_INGEST_URL);
        if ($secret === '' || $ingestUrl === '') {
            katet_crm_log('Snippet disabled: missing ingest url or site secret.');
            return;
        }

        if (!is_object($record) || !method_exists($record, 'get')) {
            return;
        }

        $formName = '';
        if (method_exists($record, 'get_form_settings')) {
            $formName = trim((string) $record->get_form_settings('form_name'));
        }

        if (!katet_crm_is_form_allowed($formName)) {
            return;
        }

        $rawFields = $record->get('fields');
        if (!is_array($rawFields) || $rawFields === array()) {
            katet_crm_log('Elementor record has no fields.', array('formName' => $formName));
            return;
        }

        $fields = katet_crm_normalize_fields($rawFields);
        $phone = katet_crm_find_phone($fields);
        if ($phone === '') {
            katet_crm_log('Skipping submit: phone was not found.', array('formName' => $formName));
            return;
        }

        $name = katet_crm_find_value(
            $fields,
            array('full_name', 'fullname', 'name', 'contact_name', 'client_name', 'fio'),
            array('text')
        );
        $company = katet_crm_find_value(
            $fields,
            array('company', 'organization', 'org', 'business', 'brand'),
            array('text')
        );
        $equipment = katet_crm_find_value(
            $fields,
            array('equipment', 'machine', 'technique', 'model', 'service', 'product')
        );
        $address = katet_crm_find_value(
            $fields,
            array('address', 'location', 'city', 'street', 'site_address')
        );
        $comment = katet_crm_find_value(
            $fields,
            array('comment', 'message', 'note', 'details', 'description')
        );
        $requestedDateRaw = katet_crm_find_value(
            $fields,
            array('requested_date', 'preferred_date', 'date', 'start_date', 'rent_date'),
            array('date', 'datetime')
        );
        $isUrgentRaw = katet_crm_find_value(
            $fields,
            array('urgent', 'asap', 'priority', 'rush')
        );

        $eventTime = gmdate('c');
        $requestedDate = katet_crm_normalize_date($requestedDateRaw);
        $isUrgent = katet_crm_is_truthy($isUrgentRaw);

        $contactName = $name !== ''
            ? $name
            : ($formName !== '' ? ('Website lead: ' . $formName) : 'Website lead');

        $payload = array(
            'lead' => array(
                'contactName' => $contactName,
                'contactPhone' => $phone,
                'contactCompany' => $company,
                'equipmentTypeHint' => $equipment,
                'requestedDate' => $requestedDate,
                'address' => $address,
                'comment' => $comment,
                'isUrgent' => $isUrgent,
            ),
            'contact' => array(
                'name' => $contactName,
                'phone' => $phone,
                'company' => $company,
            ),
            'form' => array(
                'provider' => 'elementor',
                'name' => $formName,
                'pageUrl' => katet_crm_detect_page_url(),
            ),
            'eventTime' => $eventTime,
            'rawFields' => $fields,
        );
        $payload = katet_crm_compact_payload($payload);

        $externalId = katet_crm_build_external_id($formName, $phone, $eventTime, $fields);

        $requestBody = array(
            'channel' => 'site',
            'externalId' => $externalId,
            'correlationId' => $externalId,
            'payload' => $payload,
        );

        $timestamp = (string) round(microtime(true) * 1000);
        $signatureInput = $timestamp . '.site.' . katet_crm_stable_json_encode($payload);
        $signature = hash_hmac('sha256', $signatureInput, $secret);

        $response = wp_remote_post($ingestUrl, array(
            'method' => 'POST',
            'timeout' => max(3, (int) KATET_CRM_HTTP_TIMEOUT_SEC),
            'headers' => array(
                'Content-Type' => 'application/json',
                'x-integration-timestamp' => $timestamp,
                'x-integration-signature' => 'sha256=' . $signature,
            ),
            'body' => wp_json_encode(
                $requestBody,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            ),
            'data_format' => 'body',
        ));

        if (is_wp_error($response)) {
            katet_crm_log('Request failed.', array(
                'formName' => $formName,
                'error' => $response->get_error_message(),
            ));
            return;
        }

        $statusCode = (int) wp_remote_retrieve_response_code($response);
        if ($statusCode >= 300) {
            katet_crm_log('CRM replied with non-success status.', array(
                'formName' => $formName,
                'status' => $statusCode,
                'body' => wp_remote_retrieve_body($response),
            ));
            return;
        }

        katet_crm_log('Lead sent to CRM.', array(
            'formName' => $formName,
            'status' => $statusCode,
            'externalId' => $externalId,
        ));
    }
}

if (!function_exists('katet_crm_is_form_allowed')) {
    function katet_crm_is_form_allowed($formName)
    {
        $allowlistRaw = trim((string) KATET_CRM_FORM_NAMES_ALLOWLIST);
        if ($allowlistRaw === '') {
            return true;
        }

        $allowed = array();
        $chunks = explode(',', $allowlistRaw);
        foreach ($chunks as $chunk) {
            $value = strtolower(trim($chunk));
            if ($value !== '') {
                $allowed[$value] = true;
            }
        }

        $key = strtolower(trim((string) $formName));
        return isset($allowed[$key]);
    }
}

if (!function_exists('katet_crm_normalize_fields')) {
    function katet_crm_normalize_fields(array $rawFields)
    {
        $result = array();

        foreach ($rawFields as $fieldId => $field) {
            if (!is_array($field)) {
                continue;
            }

            $value = '';
            if (array_key_exists('raw_value', $field)) {
                $value = katet_crm_value_to_string($field['raw_value']);
            } elseif (array_key_exists('value', $field)) {
                $value = katet_crm_value_to_string($field['value']);
            }

            $result[] = array(
                'id' => trim((string) $fieldId),
                'title' => isset($field['title']) ? trim((string) $field['title']) : '',
                'type' => isset($field['type']) ? trim((string) $field['type']) : '',
                'value' => trim($value),
            );
        }

        return $result;
    }
}

if (!function_exists('katet_crm_value_to_string')) {
    function katet_crm_value_to_string($value)
    {
        if ($value === null) {
            return '';
        }

        if (is_scalar($value)) {
            return (string) $value;
        }

        if (is_array($value)) {
            $parts = array();
            foreach ($value as $item) {
                $str = trim(katet_crm_value_to_string($item));
                if ($str !== '') {
                    $parts[] = $str;
                }
            }
            return implode(', ', $parts);
        }

        $encoded = wp_json_encode(
            $value,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        );
        return is_string($encoded) ? $encoded : '';
    }
}

if (!function_exists('katet_crm_find_phone')) {
    function katet_crm_find_phone(array $fields)
    {
        $fromKeywords = katet_crm_find_value(
            $fields,
            array('phone', 'tel', 'mobile', 'whatsapp', 'contact_phone'),
            array('tel', 'phone', 'text')
        );

        if ($fromKeywords !== '') {
            return $fromKeywords;
        }

        foreach ($fields as $field) {
            $type = strtolower((string) ($field['type'] ?? ''));
            $value = trim((string) ($field['value'] ?? ''));
            if ($value === '') {
                continue;
            }
            if ($type === 'tel' || $type === 'phone') {
                return $value;
            }
        }

        return '';
    }
}

if (!function_exists('katet_crm_find_value')) {
    function katet_crm_find_value(array $fields, array $keywords, array $preferredTypes = array())
    {
        $keywordsMap = array();
        foreach ($keywords as $keyword) {
            $key = strtolower(trim((string) $keyword));
            if ($key !== '') {
                $keywordsMap[$key] = true;
            }
        }

        $typesMap = array();
        foreach ($preferredTypes as $type) {
            $key = strtolower(trim((string) $type));
            if ($key !== '') {
                $typesMap[$key] = true;
            }
        }

        foreach ($fields as $field) {
            $id = strtolower((string) ($field['id'] ?? ''));
            $title = strtolower((string) ($field['title'] ?? ''));
            $type = strtolower((string) ($field['type'] ?? ''));
            $value = trim((string) ($field['value'] ?? ''));
            if ($value === '') {
                continue;
            }

            $matched = false;
            foreach ($keywordsMap as $keyword => $_) {
                if (strpos($id, $keyword) !== false || strpos($title, $keyword) !== false) {
                    $matched = true;
                    break;
                }
            }

            if (!$matched) {
                continue;
            }

            if ($typesMap !== array() && !isset($typesMap[$type])) {
                continue;
            }

            return $value;
        }

        if ($typesMap !== array()) {
            foreach ($fields as $field) {
                $type = strtolower((string) ($field['type'] ?? ''));
                $value = trim((string) ($field['value'] ?? ''));
                if ($value === '') {
                    continue;
                }
                if (isset($typesMap[$type])) {
                    return $value;
                }
            }
        }

        return '';
    }
}

if (!function_exists('katet_crm_is_truthy')) {
    function katet_crm_is_truthy($value)
    {
        $normalized = strtolower(trim((string) $value));
        if ($normalized === '') {
            return false;
        }

        return in_array($normalized, array('1', 'true', 'yes', 'on', 'checked', 'urgent', 'high'), true);
    }
}

if (!function_exists('katet_crm_normalize_date')) {
    function katet_crm_normalize_date($value)
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return '';
        }

        $timestamp = strtotime($raw);
        if ($timestamp === false) {
            return '';
        }

        return gmdate('c', $timestamp);
    }
}

if (!function_exists('katet_crm_detect_page_url')) {
    function katet_crm_detect_page_url()
    {
        if (!isset($_SERVER['HTTP_REFERER'])) {
            return '';
        }

        $url = trim((string) wp_unslash($_SERVER['HTTP_REFERER']));
        if ($url === '') {
            return '';
        }

        return esc_url_raw($url);
    }
}

if (!function_exists('katet_crm_build_external_id')) {
    function katet_crm_build_external_id($formName, $phone, $eventTime, array $fields)
    {
        $seed = array(
            'provider' => 'elementor',
            'formName' => trim((string) $formName),
            'phone' => preg_replace('/\D+/', '', (string) $phone),
            'eventTime' => trim((string) $eventTime),
            'fieldsDigest' => sha1(katet_crm_stable_json_encode($fields)),
        );

        return 'elementor-' . substr(sha1(katet_crm_stable_json_encode($seed)), 0, 32);
    }
}

if (!function_exists('katet_crm_compact_payload')) {
    function katet_crm_compact_payload($value)
    {
        if (!is_array($value)) {
            return $value;
        }

        $isAssoc = katet_crm_is_assoc($value);
        $result = array();

        foreach ($value as $key => $item) {
            $next = katet_crm_compact_payload($item);

            if ($next === null) {
                continue;
            }

            if (is_string($next) && trim($next) === '') {
                continue;
            }

            if (is_array($next) && $next === array()) {
                continue;
            }

            if ($isAssoc) {
                $result[$key] = $next;
            } else {
                $result[] = $next;
            }
        }

        return $result;
    }
}

if (!function_exists('katet_crm_is_assoc')) {
    function katet_crm_is_assoc(array $value)
    {
        if ($value === array()) {
            return false;
        }

        return array_keys($value) !== range(0, count($value) - 1);
    }
}

if (!function_exists('katet_crm_recursive_sort')) {
    function katet_crm_recursive_sort($value)
    {
        if (!is_array($value)) {
            return $value;
        }

        if (katet_crm_is_assoc($value)) {
            ksort($value, SORT_STRING);
        }

        foreach ($value as $key => $item) {
            $value[$key] = katet_crm_recursive_sort($item);
        }

        return $value;
    }
}

if (!function_exists('katet_crm_stable_json_encode')) {
    function katet_crm_stable_json_encode($value)
    {
        $normalized = katet_crm_recursive_sort($value);
        $json = wp_json_encode(
            $normalized,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        );
        return is_string($json) ? $json : '{}';
    }
}

if (!function_exists('katet_crm_log')) {
    function katet_crm_log($message, array $context = array())
    {
        if (!KATET_CRM_DEBUG_LOG) {
            return;
        }

        $line = '[Katet CRM Elementor] ' . trim((string) $message);
        if ($context !== array()) {
            $encoded = wp_json_encode(
                $context,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            );
            if (is_string($encoded) && $encoded !== '') {
                $line .= ' ' . $encoded;
            }
        }

        error_log($line);
    }
}
