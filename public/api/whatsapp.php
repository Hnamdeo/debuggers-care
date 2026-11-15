<?php
// WhatsApp Business (Meta Cloud API) for automatic appointment messages.
// Each clinic connects its own WhatsApp Business number in Settings; the access token
// is stored only in that clinic's database on the server and never sent back to browsers.

declare(strict_types=1);

const WA_GRAPH = 'https://graph.facebook.com/v21.0';
const WA_DEFAULTS = ['enabled' => false, 'phoneNumberId' => '', 'token' => '', 'template' => 'appointment_reminder', 'lang' => 'en', 'minutesBefore' => 30, 'dayBefore' => false, 'dayBeforeHour' => 18];

// Body variables of the approved template, in order:
// {{1}} patient first name, {{2}} clinic name, {{3}} day, {{4}} time, {{5}} doctor.
function waParams(array $patient, array $appt, string $clinic, string $doctor): array {
  $first = ucfirst(explode(' ', trim((string)($patient['name'] ?? '')))[0] ?: 'there');
  $d = strtotime((string)$appt['date']);
  $today = strtotime(date('Y-m-d'));
  $day = $d === $today ? 'today, ' . date('j M', $d) : ($d === $today + 86400 ? 'tomorrow, ' . date('j M', $d) : date('j M Y', $d));
  $time = date('g:i A', strtotime('2000-01-01 ' . $appt['time']));
  return [$first, $clinic, $day, $time, $doctor ?: 'the doctor'];
}

// Sends one template message. Returns ['ok' => bool, 'id' => message id, 'error' => text].
function waSend(array $cfg, string $phone10, array $params): array {
  $to = '91' . preg_replace('/\D/', '', $phone10);
  if (strlen($to) !== 12) return ['ok' => false, 'error' => 'No valid 10-digit mobile number'];
  $body = [
    'messaging_product' => 'whatsapp',
    'to' => $to,
    'type' => 'template',
    'template' => [
      'name' => $cfg['template'],
      'language' => ['code' => $cfg['lang']],
      'components' => [['type' => 'body', 'parameters' => array_map(fn($t) => ['type' => 'text', 'text' => (string)$t], $params)]],
    ],
  ];
  $ch = curl_init(WA_GRAPH . '/' . rawurlencode($cfg['phoneNumberId']) . '/messages');
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $cfg['token'], 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
  ]);
  $raw = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err = curl_error($ch);
  curl_close($ch);
  if ($raw === false) return ['ok' => false, 'error' => "Network: $err"];
  $res = json_decode((string)$raw, true) ?: [];
  if ($code >= 400 || isset($res['error'])) return ['ok' => false, 'error' => (string)($res['error']['message'] ?? "HTTP $code")];
  return ['ok' => true, 'id' => (string)($res['messages'][0]['id'] ?? '')];
}

// What browsers may see of the settings: everything except the token itself.
function waPublic(array $cfg): array {
  $out = $cfg;
  unset($out['token']);
  $out['hasToken'] = ($cfg['token'] ?? '') !== '';
  return $out;
}
