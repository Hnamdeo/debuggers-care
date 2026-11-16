<?php
// Sales leads from the "Get a free demo" form on the product page.
//
//   POST leads.php?a=add   public   {name, clinic, city, phone, kind, note, source, website(honeypot)}
//   POST leads.php?a=list  key      {key}            -> every lead, newest first
//   POST leads.php?a=mark  key      {key, id, status, note}
//
// Leads are kept in data/leads.sqlite, next to the clinics' databases: never reachable
// from the web and never touched by deploys. The list is protected by a separate key
// (bcrypt hash in config.php as leads_key_hash).

declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out(array $body, int $code = 200) {
  http_response_code($code);
  echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function clean($v, int $max): string {
  $v = trim(preg_replace('/\s+/u', ' ', (string)($v ?? '')) ?? '');
  return mb_substr($v, 0, $max);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['error' => 'Use POST.'], 405);
$config = require __DIR__ . '/config.php';
$in = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($in)) out(['error' => 'Bad request body.'], 400);
$action = (string)($_GET['a'] ?? '');

$dir = __DIR__ . '/data';
if (!is_dir($dir)) mkdir($dir, 0750, true);
$pdo = new PDO("sqlite:$dir/leads.sqlite", null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
$pdo->exec('CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, name TEXT, clinic TEXT, city TEXT, phone TEXT NOT NULL, kind TEXT, note TEXT, source TEXT, status TEXT NOT NULL DEFAULT \'new\', followup TEXT, ip TEXT);
  CREATE TABLE IF NOT EXISTS hits (ip TEXT NOT NULL, at INTEGER NOT NULL);');

$ip = $_SERVER['REMOTE_ADDR'] ?? '';

if ($action === 'add') {
  // Bots fill every field, people never see this one.
  if (clean($in['website'] ?? '', 200) !== '') out(['ok' => true]);
  $pdo->prepare('DELETE FROM hits WHERE at < ?')->execute([time() - 3600]);
  $n = $pdo->prepare('SELECT COUNT(*) FROM hits WHERE ip = ?'); $n->execute([$ip]);
  if ((int)$n->fetchColumn() >= 8) out(['error' => 'Too many requests. Please call or WhatsApp us instead.'], 429);
  $pdo->prepare('INSERT INTO hits (ip, at) VALUES (?, ?)')->execute([$ip, time()]);

  $phone = preg_replace('/\D/', '', (string)($in['phone'] ?? '')) ?? '';
  if (strlen($phone) === 12 && str_starts_with($phone, '91')) $phone = substr($phone, 2);
  if (!preg_match('/^[6-9]\d{9}$/', $phone)) out(['error' => 'Please enter a 10-digit mobile number.'], 400);
  $name = clean($in['name'] ?? '', 80);
  if ($name === '') out(['error' => 'Please enter your name.'], 400);
  $pdo->prepare('INSERT INTO leads (at, name, clinic, city, phone, kind, note, source, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    ->execute([time(), $name, clean($in['clinic'] ?? '', 120), clean($in['city'] ?? '', 60), $phone, clean($in['kind'] ?? '', 40), clean($in['note'] ?? '', 500), clean($in['source'] ?? '', 120), $ip]);
  out(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
}

// Everything below needs the leads key.
$hash = (string)($config['leads_key_hash'] ?? '');
usleep(150000);
if ($hash === '' || !password_verify((string)($in['key'] ?? ''), $hash)) out(['error' => 'Wrong key.'], 401);

if ($action === 'list') {
  $rows = $pdo->query('SELECT id, at, name, clinic, city, phone, kind, note, source, status, followup FROM leads ORDER BY id DESC LIMIT 2000')->fetchAll();
  out(['leads' => $rows]);
}
if ($action === 'mark') {
  $status = clean($in['status'] ?? '', 20);
  if (!in_array($status, ['new', 'contacted', 'demo', 'trial', 'won', 'lost'], true)) out(['error' => 'Unknown status.'], 400);
  $pdo->prepare('UPDATE leads SET status = ?, followup = ? WHERE id = ?')->execute([$status, clean($in['followup'] ?? '', 300), (int)($in['id'] ?? 0)]);
  out(['ok' => true]);
}
out(['error' => 'Unknown action.'], 404);
