<?php
// Automatic WhatsApp appointment messages. Run by a Hostinger cron job every 5 minutes:
//   php /home/<user>/domains/debuggersspace.com/public_html/care/api/cron.php
// For each live clinic that switched it on in Settings, it sends the approved template
//   - about N minutes before each booked appointment (default 30), and
//   - optionally the evening before (default 6 PM) for tomorrow's appointments.
// Each appointment gets each message once; the app shows "Auto reminder sent".

declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
date_default_timezone_set('Asia/Kolkata');
require __DIR__ . '/whatsapp.php';

$config = require __DIR__ . '/config.php';
$now = time();
$dry = in_array('--dry', $argv ?? [], true);

foreach (array_keys($config['clinics']) as $slug) {
  $file = __DIR__ . "/data/$slug.sqlite";
  if (!file_exists($file)) continue;
  $pdo = new PDO("sqlite:$file", null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  $pdo->exec('PRAGMA busy_timeout=5000;');
  $meta = function (string $k) use ($pdo): ?string { $s = $pdo->prepare('SELECT v FROM meta WHERE k = ?'); $s->execute([$k]); $v = $s->fetchColumn(); return $v === false ? null : (string)$v; };
  $setMeta = function (string $k, string $v) use ($pdo): void { $pdo->prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')->execute([$k, $v]); };
  $setMeta('wa_last_run', (string)$now);
  $cfg = array_merge(WA_DEFAULTS, json_decode($meta('wa') ?? '{}', true) ?: []);
  if (!$cfg['enabled'] || $cfg['token'] === '' || $cfg['phoneNumberId'] === '') continue;

  $tenant = json_decode($meta('tenant') ?? '{}', true) ?: [];
  $clinicName = (string)($cfg['clinicName'] ?? '') ?: (string)($tenant['name'] ?? $slug);
  $get = function (string $coll, string $id) use ($pdo): ?array { $s = $pdo->prepare('SELECT data FROM records WHERE coll = ? AND id = ?'); $s->execute([$coll, $id]); $v = $s->fetchColumn(); return $v === false ? null : json_decode((string)$v, true); };

  $today = date('Y-m-d', $now);
  $tomorrow = date('Y-m-d', $now + 86400);
  $rows = $pdo->query("SELECT data FROM records WHERE coll = 'appointments'")->fetchAll();
  $log = json_decode($meta('wa_log') ?? '[]', true) ?: [];
  foreach ($rows as $r) {
    $a = json_decode($r['data'], true);
    if (($a['status'] ?? '') !== 'scheduled' || !in_array($a['date'] ?? '', [$today, $tomorrow], true)) continue;
    $start = strtotime("{$a['date']} {$a['time']}");
    $send = null;
    $mins = max(5, (int)$cfg['minutesBefore']);
    if (empty($a['autoSoonAt']) && $start > $now && $start - $now <= $mins * 60) $send = 'autoSoonAt';
    elseif ($cfg['dayBefore'] && empty($a['autoDayBeforeAt']) && $a['date'] === $tomorrow && (int)date('G', $now) >= (int)$cfg['dayBeforeHour']) $send = 'autoDayBeforeAt';
    if (!$send) continue;
    $p = $get('patients', (string)$a['patientId']) ?? [];
    $doc = $get('staff', (string)$a['doctorId']) ?? [];
    $params = waParams($p, $a, $clinicName, (string)($doc['name'] ?? ''));
    $res = $dry ? ['ok' => true, 'id' => 'dry-run'] : waSend($cfg, (string)($p['phone'] ?? ''), $params);
    if (!$dry) $log[] = ['at' => $now, 'appt' => $a['id'], 'patient' => $p['name'] ?? '', 'kind' => $send === 'autoSoonAt' ? "{$mins} min before" : 'day before', 'ok' => $res['ok'], 'error' => $res['error'] ?? ''];
    echo "$slug {$a['id']} $send " . ($res['ok'] ? 'sent' : 'FAILED ' . $res['error']) . "\n";
    if ($dry) continue;
    // Mark it (also on failure, so one bad number is not retried every 5 minutes) and bump the revision so browsers see it.
    $pdo->beginTransaction();
    $cur = json_decode((string)$pdo->query("SELECT data FROM records WHERE coll = 'appointments' AND id = " . $pdo->quote((string)$a['id']))->fetchColumn(), true) ?: $a;
    $cur[$send] = date('c', $now);
    if ($res['ok']) { $cur['remindedAt'] = $cur['remindedAt'] ?? date('c', $now); $cur['remindedVia'] = 'auto'; }
    else $cur['autoError'] = $res['error'];
    $rev = (int)($meta('rev') ?? '0') + 1;
    $setMeta('rev', (string)$rev);
    $pdo->prepare('UPDATE records SET data = ?, rev = ? WHERE coll = ? AND id = ?')->execute([json_encode($cur, JSON_UNESCAPED_UNICODE), $rev, 'appointments', (string)$a['id']]);
    $pdo->commit();
  }
  $setMeta('wa_log', json_encode(array_slice($log, -40), JSON_UNESCAPED_UNICODE));
}
