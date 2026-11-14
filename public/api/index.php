<?php
// Clinic & Hospital Management System: server API for live clinics.
//
// One SQLite database file per clinic (api/data/<slug>.sqlite), so clinics never
// share tables. Records are kept per collection (patients, visits, bills, ...) as
// JSON documents with a revision number; browsers pull changes since their last
// revision every few seconds, so every device in a clinic sees the same data.
//
// Calls: POST /api/index.php?t=<slug>&a=<action> with a JSON body.
//   status    public   is this clinic set up on the server yet? its staff list
//   login     public   staff password -> session token (first login also creates the clinic)
//   logout    staff
//   pull      staff    changes since a revision
//   add       staff    new record; the server gives it the next id (P-1001, ...)
//   update    staff    change fields of a record
//   tenant    staff    change clinic settings
//   register  public   patient self-registration from the QR code (name + mobile required)
//   export    staff    whole clinic as one backup file
//   import    admin    replace the clinic with a backup file
//   password  admin    change the staff password
//   setpin    staff    make a 6-digit login PIN for a patient (shown once, to hand over)
//   plogin    public   patient: mobile number + PIN -> session that sees only their own records

declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');

const DATA_DIR = __DIR__ . '/data';
const SESSION_DAYS = 30;
const PREFIX = ['patients' => 'P', 'appointments' => 'A', 'prescriptions' => 'RX', 'reports' => 'LAB', 'bills' => 'INV', 'medicines' => 'M', 'sales' => 'SL', 'beds' => 'BED', 'admissions' => 'IPD', 'emergencies' => 'ER', 'payroll' => 'PAY', 'staff' => 'S', 'users' => 'U', 'videos' => 'V', 'shares' => 'SH', 'visits' => 'VS', 'images' => 'IMG'];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out(array $body, int $code = 200) {
  http_response_code($code);
  echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function fail(string $msg, int $code = 400) { out(['error' => $msg], $code); }

$config = require __DIR__ . '/config.php';
$slug = strtolower((string)($_GET['t'] ?? ''));
$action = (string)($_GET['a'] ?? '');
if (!isset($config['clinics'][$slug])) fail('Unknown clinic.', 404);
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $action !== 'file') fail('Use POST.', 405);
$clinic = $config['clinics'][$slug];
$in = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($in)) fail('Bad request body.');

if (!is_dir(DATA_DIR)) mkdir(DATA_DIR, 0750, true);
$file = DATA_DIR . "/$slug.sqlite";
$fresh = !file_exists($file);
$pdo = new PDO("sqlite:$file", null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
$pdo->exec('CREATE TABLE IF NOT EXISTS records (coll TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, rev INTEGER NOT NULL, PRIMARY KEY (coll, id));
  CREATE INDEX IF NOT EXISTS records_rev ON records(rev);
  CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS counters (prefix TEXT PRIMARY KEY, n INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS hits (ip TEXT NOT NULL, at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS audit (at INTEGER NOT NULL, user_id TEXT, action TEXT NOT NULL, coll TEXT, rec_id TEXT);
  CREATE TABLE IF NOT EXISTS pins (patient_id TEXT PRIMARY KEY, hash TEXT NOT NULL, set_at INTEGER NOT NULL);');

function meta(string $k): ?string {
  global $pdo;
  $s = $pdo->prepare('SELECT v FROM meta WHERE k = ?');
  $s->execute([$k]);
  $v = $s->fetchColumn();
  return $v === false ? null : (string)$v;
}
function setMeta(string $k, string $v): void {
  global $pdo;
  $pdo->prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')->execute([$k, $v]);
}
function nextRev(): int {
  $r = (int)(meta('rev') ?? '0') + 1;
  setMeta('rev', (string)$r);
  return $r;
}
function getRec(string $coll, string $id): ?array {
  global $pdo;
  $s = $pdo->prepare('SELECT data FROM records WHERE coll = ? AND id = ?');
  $s->execute([$coll, $id]);
  $v = $s->fetchColumn();
  return $v === false ? null : json_decode((string)$v, true);
}
function putRec(string $coll, array $row, int $rev): void {
  global $pdo;
  $pdo->prepare('INSERT INTO records (coll, id, data, rev) VALUES (?, ?, ?, ?) ON CONFLICT(coll, id) DO UPDATE SET data = excluded.data, rev = excluded.rev')
    ->execute([$coll, (string)$row['id'], json_encode($row, JSON_UNESCAPED_UNICODE), $rev]);
}
function nextId(string $coll): string {
  global $pdo;
  $p = PREFIX[$coll] ?? null;
  if (!$p) fail('Unknown list.');
  $pdo->prepare('INSERT INTO counters (prefix, n) VALUES (?, 1000) ON CONFLICT(prefix) DO NOTHING')->execute([$p]);
  $pdo->prepare('UPDATE counters SET n = n + 1 WHERE prefix = ?')->execute([$p]);
  $s = $pdo->prepare('SELECT n FROM counters WHERE prefix = ?');
  $s->execute([$p]);
  return $p . '-' . $s->fetchColumn();
}
function audit(?string $uid, string $action, ?string $coll = null, ?string $id = null): void {
  global $pdo;
  $pdo->prepare('INSERT INTO audit (at, user_id, action, coll, rec_id) VALUES (?, ?, ?, ?, ?)')->execute([time(), $uid, $action, $coll, $id]);
}
function clean($v): array {
  // Records are plain JSON objects; drop anything that tries to change the id.
  if (!is_array($v)) fail('A record must be an object.');
  unset($v['id']);
  return $v;
}
function users(): array {
  global $pdo;
  $s = $pdo->query("SELECT data FROM records WHERE coll = 'users'");
  return array_map(fn($r) => json_decode($r['data'], true), $s->fetchAll());
}
function publicStaff(): array {
  // What the sign-in screen needs: who can sign in, never their passwords.
  $staff = [];
  foreach (users() as $u) {
    if (($u['role'] ?? '') === 'patient') continue;
    $s = getRec('staff', (string)$u['refId']) ?? [];
    $staff[] = ['id' => $u['id'], 'role' => $u['role'], 'refId' => $u['refId'], 'name' => $s['name'] ?? '', 'title' => $s['title'] ?? ''];
  }
  return $staff;
}
function session(): array {
  global $pdo;
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  $tok = preg_match('/^Bearer\s+([A-Za-z0-9_-]{20,})$/', $h, $m) ? $m[1] : (string)($_GET['k'] ?? '');
  if ($tok === '') fail('Please sign in.', 401);
  $s = $pdo->prepare('SELECT user_id, expires FROM sessions WHERE token_hash = ?');
  $s->execute([hash('sha256', $tok)]);
  $row = $s->fetch();
  if (!$row || $row['expires'] < time()) fail('Your sign-in has expired. Please sign in again.', 401);
  // Patients sign in with mobile + PIN; they are not staff users, just a view of one patient.
  if (str_starts_with($row['user_id'], 'PT:')) {
    $pid = substr($row['user_id'], 3);
    if (!getRec('patients', $pid)) fail('Please sign in.', 401);
    return patientUser($pid) + ['_token_hash' => hash('sha256', $tok)];
  }
  $u = getRec('users', $row['user_id']);
  if (!$u) fail('Please sign in.', 401);
  return $u + ['_token_hash' => hash('sha256', $tok)];
}
function patientUser(string $pid): array { return ['id' => "PT:$pid", 'role' => 'patient', 'refId' => $pid]; }
function staffOnly(): array {
  $u = session();
  if (($u['role'] ?? '') === 'patient') fail('Only clinic staff can do that.', 403);
  return $u;
}
// What a signed-in patient may see: their own records, the doctors' public details and the videos.
const PATIENT_COLLS = ['appointments', 'prescriptions', 'reports', 'bills', 'visits', 'images', 'admissions', 'shares'];
function patientView(string $coll, array $row, string $pid): ?array {
  if ($coll === 'patients') return ($row['id'] ?? '') === $pid ? $row : null;
  if (in_array($coll, PATIENT_COLLS, true)) return ($row['patientId'] ?? '') === $pid ? $row : null;
  if ($coll === 'staff') return array_intersect_key($row, array_flip(['id', 'name', 'gender', 'role', 'dept', 'title', 'qualification', 'regNo', 'fee']));
  if ($coll === 'videos') return $row;
  return null;
}
function rateLimit(int $max, int $seconds): void {
  global $pdo;
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  $pdo->prepare('DELETE FROM hits WHERE at < ?')->execute([time() - 86400]);
  $s = $pdo->prepare('SELECT COUNT(*) FROM hits WHERE ip = ? AND at > ?');
  $s->execute([$ip, time() - $seconds]);
  if ((int)$s->fetchColumn() >= $max) fail('Too many tries. Please wait a few minutes and try again.', 429);
  $pdo->prepare('INSERT INTO hits (ip, at) VALUES (?, ?)')->execute([$ip, time()]);
}
function initialised(): bool { return meta('tenant') !== null; }
function tenantOut(): array { return json_decode(meta('tenant') ?? '{}', true); }
function staffPasswordHash(): string { return meta('staff_pw') ?? $GLOBALS['clinic']['initial_password_hash']; }

switch ($action) {
  case 'status':
    out(['ready' => initialised(), 'staff' => initialised() ? publicStaff() : []]);

  case 'login': {
    rateLimit(10, 600);
    $pw = (string)($in['password'] ?? '');
    if (!password_verify($pw, staffPasswordHash())) fail('That password is not right. Please try again.', 403);
    $pdo->beginTransaction();
    if (!initialised()) {
      // First sign-in: the browser sends the clinic's starting data (its doctors,
      // medicine list, settings, or records already kept on that computer).
      $seed = $in['seed'] ?? null;
      if (!is_array($seed) || !is_array($seed['tenant'] ?? null) || !is_array($seed['data'] ?? null)) fail('Clinic setup data missing.');
      $rev = nextRev();
      setMeta('tenant', json_encode(array_merge($seed['tenant'], ['slug' => $slug]), JSON_UNESCAPED_UNICODE));
      foreach ($seed['data'] as $coll => $rows) {
        if (!isset(PREFIX[$coll]) || !is_array($rows)) continue;
        foreach ($rows as $row) if (is_array($row) && isset($row['id'])) { unset($row['password'], $row['pwHash']); putRec($coll, $row, $rev); }
      }
      foreach (($seed['counters'] ?? []) as $p => $n) if (in_array($p, PREFIX, true)) $pdo->prepare('INSERT INTO counters (prefix, n) VALUES (?, ?) ON CONFLICT(prefix) DO UPDATE SET n = MAX(n, excluded.n)')->execute([$p, (int)$n]);
      audit(null, 'setup');
    }
    $u = getRec('users', (string)($in['userId'] ?? ''));
    if (!$u || ($u['role'] ?? '') === 'patient') { $pdo->rollBack(); fail('Pick who is signing in.'); }
    $tok = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    $pdo->prepare('INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)')->execute([hash('sha256', $tok), $u['id'], time() + SESSION_DAYS * 86400]);
    $pdo->prepare('DELETE FROM sessions WHERE expires < ?')->execute([time()]);
    audit($u['id'], 'login');
    $pdo->commit();
    unset($u['password'], $u['pwHash']);
    out(['token' => $tok, 'user' => $u]);
  }

  case 'logout': {
    $u = session();
    $pdo->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([$u['_token_hash']]);
    out(['ok' => true]);
  }

  case 'pull': {
    $u = session();
    $since = (int)($in['since'] ?? 0);
    $reset = $since > 0 && $since < (int)(meta('reset_rev') ?? '0');
    $s = $pdo->prepare('SELECT coll, data, rev FROM records WHERE rev > ? ORDER BY rev');
    $s->execute([$reset ? 0 : $since]);
    $changes = array_map(fn($r) => ['coll' => $r['coll'], 'row' => json_decode($r['data'], true)], $s->fetchAll());
    foreach ($changes as &$c) if ($c['coll'] === 'users') unset($c['row']['password'], $c['row']['pwHash']);
    unset($c);
    if (($u['role'] ?? '') === 'patient') {
      $mine = [];
      foreach ($changes as $c) { $v = patientView($c['coll'], $c['row'], $u['refId']); if ($v !== null) $mine[] = ['coll' => $c['coll'], 'row' => $v]; }
      if ($since === 0 || $reset) $mine[] = ['coll' => 'users', 'row' => patientUser($u['refId'])];
      $changes = $mine;
    }
    out(['reset' => $reset, 'rev' => (int)(meta('rev') ?? '0'), 'tenant' => tenantOut(), 'tenantRev' => (int)(meta('tenant_rev') ?? '0'), 'changes' => $changes]);
  }

  case 'add': {
    $u = session();
    $coll = (string)($in['coll'] ?? '');
    if ($coll === 'users') fail('Staff logins are managed by the admin.');
    $data = clean($in['data'] ?? null);
    if (($u['role'] ?? '') === 'patient') {
      if ($coll !== 'appointments') fail('Only clinic staff can do that.', 403);
      $data['patientId'] = $u['refId'];
      $data['status'] = 'scheduled';
      $data['bookedOnline'] = true;
    }
    $pdo->beginTransaction();
    $row = ['id' => nextId($coll)] + $data;
    $rev = nextRev();
    putRec($coll, $row, $rev);
    audit($u['id'], 'add', $coll, $row['id']);
    $pdo->commit();
    out(['row' => $row, 'rev' => $rev]);
  }

  case 'update': {
    $u = staffOnly();
    $coll = (string)($in['coll'] ?? '');
    $id = (string)($in['id'] ?? '');
    if (!isset(PREFIX[$coll])) fail('Unknown list.');
    $pdo->beginTransaction();
    $old = getRec($coll, $id);
    if (!$old) { $pdo->rollBack(); fail('That record no longer exists.', 404); }
    $patch = clean($in['patch'] ?? null);
    unset($patch['password'], $patch['pwHash']);
    $row = array_merge($old, $patch);
    $rev = nextRev();
    putRec($coll, $row, $rev);
    audit($u['id'], 'update', $coll, $id);
    $pdo->commit();
    out(['row' => $row, 'rev' => $rev]);
  }

  case 'tenant': {
    $u = staffOnly();
    $patch = $in['patch'] ?? null;
    if (!is_array($patch)) fail('Nothing to change.');
    unset($patch['id'], $patch['slug']);
    setMeta('tenant', json_encode(array_merge(tenantOut(), $patch), JSON_UNESCAPED_UNICODE));
    setMeta('tenant_rev', (string)((int)(meta('tenant_rev') ?? '0') + 1));
    audit($u['id'], 'settings');
    out(['tenant' => tenantOut()]);
  }

  case 'register': {
    rateLimit(15, 3600);
    if (!initialised()) fail('This clinic is not taking registrations yet. Please ask at the front desk.', 409);
    $p = $in['patient'] ?? null;
    if (!is_array($p)) fail('Please fill in your details.');
    $name = trim((string)($p['name'] ?? ''));
    $phone = substr(preg_replace('/\D/', '', (string)($p['phone'] ?? '')), -10);
    if (mb_strlen($name) < 2) fail('Please type your full name.');
    if (!preg_match('/^[6-9]\d{9}$/', $phone)) fail('Please give a 10-digit mobile number.');
    $allowed = ['name', 'phone', 'email', 'dob', 'ageYears', 'dobApprox', 'gender', 'blood', 'allergies', 'conditions', 'address', 'emergencyContact', 'visitReason'];
    $rec = array_intersect_key($p, array_flip($allowed));
    foreach ($rec as $k => $v) $rec[$k] = is_scalar($v) ? mb_substr(trim((string)$v), 0, 300) : '';
    $rec['name'] = $name;
    $rec['phone'] = $phone;
    $rec['selfRegistered'] = true;
    $rec['consentOn'] = date('Y-m-d');
    $pdo->beginTransaction();
    $existing = null;
    foreach ($pdo->query("SELECT data FROM records WHERE coll = 'patients'")->fetchAll() as $r) {
      $d = json_decode($r['data'], true);
      if (($d['phone'] ?? '') === $phone && mb_strtolower(trim((string)($d['name'] ?? ''))) === mb_strtolower($name)) { $existing = $d; break; }
    }
    $rev = nextRev();
    if ($existing) $row = array_merge($existing, array_filter($rec, fn($v) => $v !== ''));
    else $row = ['id' => nextId('patients')] + $rec + ['regDate' => date('Y-m-d')];
    putRec('patients', $row, $rev);
    audit(null, 'register', 'patients', $row['id']);
    // Scanning the QR at the clinic means the patient is here today: put them in today's waiting list once.
    $today = date('Y-m-d');
    $visit = null;
    foreach ($pdo->query("SELECT data FROM records WHERE coll = 'visits'")->fetchAll() as $r) {
      $d = json_decode($r['data'], true);
      if (($d['patientId'] ?? '') === $row['id'] && ($d['date'] ?? '') === $today) { $visit = $d; break; }
    }
    if (!$visit) {
      $visit = ['id' => nextId('visits'), 'patientId' => $row['id'], 'date' => $today, 'time' => date('H:i'), 'status' => 'waiting', 'source' => 'qr', 'complaint' => $rec['visitReason'] ?? '', 'vitals' => new stdClass()];
      putRec('visits', $visit, $rev);
    }
    $pdo->commit();
    out(['id' => $row['id'], 'existing' => (bool)$existing, 'visitId' => $visit['id']]);
  }

  case 'export': {
    staffOnly();
    $data = [];
    foreach ($pdo->query('SELECT coll, data FROM records ORDER BY coll, id')->fetchAll() as $r) {
      $row = json_decode($r['data'], true);
      unset($row['password'], $row['pwHash']);
      $data[$r['coll']][] = $row;
    }
    $counters = [];
    foreach ($pdo->query('SELECT prefix, n FROM counters')->fetchAll() as $r) $counters[$r['prefix']] = (int)$r['n'];
    out(['kind' => 'debuggers-care-backup', 'version' => 1, 'exportedAt' => gmdate('c'), 'tenant' => tenantOut(), 'data' => $data, 'counters' => $counters]);
  }

  case 'import': {
    $u = staffOnly();
    if (!in_array($u['role'] ?? '', ['admin', 'doctor'], true)) fail('Only the admin or doctor can restore a backup.', 403);
    $b = $in['backup'] ?? null;
    if (!is_array($b) || ($b['kind'] ?? '') !== 'debuggers-care-backup' || !is_array($b['data'] ?? null)) fail('This file is not a backup of this clinic.');
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM records WHERE coll <> 'users'");
    $rev = nextRev();
    foreach ($b['data'] as $coll => $rows) {
      if (!isset(PREFIX[$coll]) || $coll === 'users' || !is_array($rows)) continue;
      foreach ($rows as $row) if (is_array($row) && isset($row['id'])) putRec($coll, $row, $rev);
    }
    foreach (($b['counters'] ?? []) as $p => $n) if (in_array($p, PREFIX, true)) $pdo->prepare('INSERT INTO counters (prefix, n) VALUES (?, ?) ON CONFLICT(prefix) DO UPDATE SET n = MAX(n, excluded.n)')->execute([$p, (int)$n]);
    if (is_array($b['tenant'] ?? null)) { setMeta('tenant', json_encode(array_merge($b['tenant'], ['slug' => $slug]), JSON_UNESCAPED_UNICODE)); setMeta('tenant_rev', (string)((int)(meta('tenant_rev') ?? '0') + 1)); }
    // Devices must reload everything after a restore.
    setMeta('reset_rev', (string)$rev);
    audit($u['id'], 'import');
    $pdo->commit();
    out(['ok' => true, 'rev' => $rev]);
  }

  case 'upload': {
    // X-rays and photos: kept as files beside the clinic database, never in a public folder.
    $u = staffOnly();
    $raw = (string)($in['data'] ?? '');
    if (!preg_match('#^data:image/(jpeg|png|webp);base64,#', $raw, $m)) fail('Please choose a photo or X-ray image.');
    $bin = base64_decode(substr($raw, strpos($raw, ',') + 1), true);
    if ($bin === false || strlen($bin) > 6 * 1024 * 1024) fail('That image is too large. Please use one under 6 MB.');
    if (@getimagesizefromstring($bin) === false) fail('That file is not an image.');
    $dir = DATA_DIR . "/files/$slug";
    if (!is_dir($dir)) mkdir($dir, 0750, true);
    $id = bin2hex(random_bytes(16)) . '.' . ($m[1] === 'jpeg' ? 'jpg' : $m[1]);
    file_put_contents("$dir/$id", $bin);
    audit($u['id'], 'upload', 'files', $id);
    out(['fileId' => $id]);
  }

  case 'file': {
    $u = session();
    $id = (string)($_GET['id'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}\.(jpg|png|webp)$/', $id, $m)) fail('Not found.', 404);
    if (($u['role'] ?? '') === 'patient') {
      $ok = false;
      foreach ($pdo->query("SELECT data FROM records WHERE coll = 'images'")->fetchAll() as $r) {
        $d = json_decode($r['data'], true);
        if (($d['fileId'] ?? '') === $id && ($d['patientId'] ?? '') === $u['refId']) { $ok = true; break; }
      }
      if (!$ok) fail('Not found.', 404);
    }
    $path = DATA_DIR . "/files/$slug/$id";
    if (!is_file($path)) fail('Not found.', 404);
    header('Content-Type: ' . ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$m[1]]);
    header('Cache-Control: private, max-age=86400');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
  }

  case 'password': {
    $u = staffOnly();
    if (!in_array($u['role'] ?? '', ['admin', 'doctor'], true)) fail('Only the admin or doctor can change the password.', 403);
    if (!password_verify((string)($in['current'] ?? ''), staffPasswordHash())) fail('The current password is not right.', 403);
    $new = (string)($in['next'] ?? '');
    if (mb_strlen($new) < 6) fail('Use at least 6 characters.');
    setMeta('staff_pw', password_hash($new, PASSWORD_DEFAULT));
    // Everyone else signs in again with the new password.
    $pdo->prepare('DELETE FROM sessions WHERE token_hash <> ?')->execute([$u['_token_hash']]);
    audit($u['id'], 'password');
    out(['ok' => true]);
  }

  case 'setpin': {
    $u = staffOnly();
    $pid = (string)($in['patientId'] ?? '');
    $p = getRec('patients', $pid);
    if (!$p) fail('Patient not found.', 404);
    if (!preg_match('/^\d{10}$/', (string)($p['phone'] ?? ''))) fail('Add the patient’s mobile number first; they sign in with it.');
    $pin = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $pdo->prepare('INSERT INTO pins (patient_id, hash, set_at) VALUES (?, ?, ?) ON CONFLICT(patient_id) DO UPDATE SET hash = excluded.hash, set_at = excluded.set_at')->execute([$pid, password_hash($pin, PASSWORD_DEFAULT), time()]);
    // A new PIN signs the patient out everywhere else.
    $pdo->prepare('DELETE FROM sessions WHERE user_id = ?')->execute(["PT:$pid"]);
    audit($u['id'], 'setpin', 'patients', $pid);
    out(['pin' => $pin]);
  }

  case 'plogin': {
    rateLimit(10, 900);
    if (!initialised()) fail('This clinic is not set up yet.', 409);
    $phone = substr(preg_replace('/\D/', '', (string)($in['phone'] ?? '')), -10);
    $pin = preg_replace('/\D/', '', (string)($in['pin'] ?? ''));
    if (strlen($phone) !== 10 || strlen($pin) !== 6) fail('Type your 10-digit mobile number and the 6-digit PIN from the clinic.');
    $match = null;
    foreach ($pdo->query('SELECT patient_id, hash FROM pins')->fetchAll() as $r) {
      $p = getRec('patients', $r['patient_id']);
      if ($p && ($p['phone'] ?? '') === $phone && password_verify($pin, $r['hash'])) { $match = $p; break; }
    }
    if (!$match) { sleep(1); fail('That mobile number and PIN do not match. Ask the clinic for a new PIN if you have lost it.', 403); }
    $tok = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    $pdo->prepare('INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)')->execute([hash('sha256', $tok), "PT:{$match['id']}", time() + SESSION_DAYS * 86400]);
    audit("PT:{$match['id']}", 'plogin');
    out(['token' => $tok, 'user' => patientUser($match['id'])]);
  }
}
fail('Unknown action.', 404);
