<?php
// AI reading of an X-ray, a clinical photo or a photographed lab report, with Claude.
//
//   POST api/ai.php?t=<slug>   { kind, image: "data:image/jpeg;base64,...", area, note, age, gender }
//
// Live clinics (in config.php) need a staff sign-in. The public demos (dental, clinic,
// hospital) need none but are capped per visitor and per day, because every read costs money.
// The API key is never in the repository: the deploy job writes it to ai-key.php from the
// ANTHROPIC_API_KEY secret, or config.php can carry 'anthropic_key'. Without a key the
// endpoint answers { off: true } and the app shows its labelled sample instead.
//
// The answer is a suggestion for the doctor, who checks it before telling the patient.

declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
@set_time_limit(150);

const DEMOS = ['dental', 'clinic', 'hospital'];
const DEMO_PER_VISITOR = 8;   // reads per visitor (IP) per day
const DEMO_PER_DAY = 150;     // reads across all demo visitors per day
const LIVE_PER_DAY = 300;     // reads per live clinic per day
const MODEL = 'claude-opus-5-5';

function out(array $b, int $code = 200) { http_response_code($code); echo json_encode($b, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function fail(string $m, int $code = 400) { out(['error' => $m], $code); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Use POST.', 405);
$config = require __DIR__ . '/config.php';
$slug = strtolower((string)($_GET['t'] ?? ''));
$live = isset($config['clinics'][$slug]);
if (!$live && !in_array($slug, DEMOS, true)) fail('Unknown clinic.', 404);

$key = is_file(__DIR__ . '/ai-key.php') ? (string)(require __DIR__ . '/ai-key.php') : (string)($config['anthropic_key'] ?? '');
if ($key === '') out(['off' => true, 'error' => 'AI reading is not switched on for this server yet.'], 503);

$in = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($in)) fail('Bad request body.');
$image = (string)($in['image'] ?? '');
if (!preg_match('#^data:(image/(?:jpeg|png|webp)|application/pdf);base64,([A-Za-z0-9+/=]+)$#', $image, $m)) fail('Send a JPG, PNG or PDF.');
[$all, $mime, $b64] = $m;
if (strlen($b64) > 7_000_000) fail('That file is too large. Please use a smaller photo.', 413);

$dir = __DIR__ . '/data';
if (!is_dir($dir)) mkdir($dir, 0750, true);

// Live clinics: only signed-in staff of that clinic.
if ($live) {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/^Bearer\s+([A-Za-z0-9_-]{20,})$/', $h, $t)) fail('Please sign in.', 401);
  $db = new PDO("sqlite:$dir/$slug.sqlite", null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  $s = $db->prepare('SELECT user_id, expires FROM sessions WHERE token_hash = ?');
  $s->execute([hash('sha256', $t[1])]);
  $row = $s->fetch();
  if (!$row || $row['expires'] < time()) fail('Please sign in again.', 401);
  if (str_starts_with($row['user_id'], 'PT:')) fail('Only clinic staff can do that.', 403);
}

// Daily limits, kept in their own small database.
$use = new PDO("sqlite:$dir/ai-usage.sqlite", null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$use->exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS reads (day TEXT NOT NULL, slug TEXT NOT NULL, ip TEXT NOT NULL, at INTEGER NOT NULL)');
$day = date('Y-m-d');
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$count = function (string $where, array $args) use ($use, $day) {
  $s = $use->prepare("SELECT COUNT(*) FROM reads WHERE day = ? AND $where");
  $s->execute(array_merge([$day], $args));
  return (int)$s->fetchColumn();
};
if ($live) {
  if ($count('slug = ?', [$slug]) >= LIVE_PER_DAY) fail('Today’s AI reads for this clinic are used up. They reset at midnight.', 429);
} else {
  if ($count('slug IN (\'dental\',\'clinic\',\'hospital\') AND ip = ?', [$ip]) >= DEMO_PER_VISITOR) fail('The demo allows a few AI reads a day per visitor. Please try again tomorrow, or ask us for your own clinic space.', 429);
  if ($count('slug IN (\'dental\',\'clinic\',\'hospital\')', []) >= DEMO_PER_DAY) fail('The demo’s AI reads for today are used up. Please try again tomorrow.', 429);
}
$use->prepare('DELETE FROM reads WHERE day < ?')->execute([date('Y-m-d', time() - 40 * 86400)]);

$clean = fn($v, $n = 300) => mb_substr(trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string)$v)), 0, $n);
$kind = $clean($in['kind'] ?? 'X-ray', 40);
$facts = array_filter([
  "What the clinic says this is: $kind",
  ($a = $clean($in['area'] ?? '', 60)) !== '' ? "Tooth or area: $a" : '',
  ($g = $clean($in['age'] ?? '', 20)) !== '' ? "Patient age: $g" : '',
  ($x = $clean($in['gender'] ?? '', 10)) !== '' ? "Patient sex: $x" : '',
  ($n = $clean($in['note'] ?? '', 400)) !== '' ? "Doctor's note so far: $n" : '',
  ($c = $clean($in['clinic'] ?? '', 40)) !== '' ? "Clinic type: $c" : '',
]);

$system = <<<TXT
You help doctors and dentists in India read medical images and lab reports. You look at one image (an X-ray such as a dental OPG or IOPA, a chest X-ray, a clinical photo) or one photographed or PDF lab report, and give the treating doctor a careful first read.

Rules:
- Describe only what is visible. Say where you are unsure, and say so in "limitations" when the image is blurred, cropped, too dark, or not a medical image (then set readable to false and keep findings empty).
- Use FDI tooth numbers for teeth when you can tell them.
- For a lab report, copy every test value you can read into lab_values with its unit and the printed reference range, and flag High or Low against that range. Do not invent values.
- severity: normal, mild, moderate, or urgent (urgent only for findings that need same-day attention).
- patient_explanation: two to four short sentences in plain English a patient with no medical background understands, without frightening them. patient_explanation_hi: the same in simple Hindi (Devanagari).
- next_steps: short, practical suggestions for the doctor (further views, tests, treatment options to consider). The doctor decides.
- Never state a final diagnosis as certain. This is a suggestion that the doctor checks.
TXT;

$schema = [
  'type' => 'object',
  'additionalProperties' => false,
  'required' => ['kind_detected', 'readable', 'summary', 'findings', 'lab_values', 'patient_explanation', 'patient_explanation_hi', 'next_steps', 'limitations'],
  'properties' => [
    'kind_detected' => ['type' => 'string'],
    'readable' => ['type' => 'boolean'],
    'summary' => ['type' => 'string'],
    'findings' => ['type' => 'array', 'items' => [
      'type' => 'object', 'additionalProperties' => false,
      'required' => ['title', 'detail', 'location', 'severity'],
      'properties' => [
        'title' => ['type' => 'string'], 'detail' => ['type' => 'string'], 'location' => ['type' => 'string'],
        'severity' => ['type' => 'string', 'enum' => ['normal', 'mild', 'moderate', 'urgent']],
      ],
    ]],
    'lab_values' => ['type' => 'array', 'items' => [
      'type' => 'object', 'additionalProperties' => false,
      'required' => ['test', 'value', 'unit', 'range', 'flag'],
      'properties' => [
        'test' => ['type' => 'string'], 'value' => ['type' => 'string'], 'unit' => ['type' => 'string'], 'range' => ['type' => 'string'],
        'flag' => ['type' => 'string', 'enum' => ['', 'High', 'Low']],
      ],
    ]],
    'patient_explanation' => ['type' => 'string'],
    'patient_explanation_hi' => ['type' => 'string'],
    'next_steps' => ['type' => 'array', 'items' => ['type' => 'string']],
    'limitations' => ['type' => 'string'],
  ],
];

$file = $mime === 'application/pdf'
  ? ['type' => 'document', 'source' => ['type' => 'base64', 'media_type' => $mime, 'data' => $b64]]
  : ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => $mime, 'data' => $b64]];
$body = [
  'model' => MODEL,
  'max_tokens' => 6000,
  'system' => $system,
  'output_config' => ['effort' => 'medium', 'format' => ['type' => 'json_schema', 'schema' => $schema]],
  'fallbacks' => 'default',
  'messages' => [['role' => 'user', 'content' => [$file, ['type' => 'text', 'text' => implode("\n", $facts) . "\n\nRead this and answer in the JSON format."]]]],
];

$ch = curl_init((string)($config['anthropic_url'] ?? 'https://api.anthropic.com/v1/messages'));
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 140,
  CURLOPT_CONNECTTIMEOUT => 15,
  CURLOPT_HTTPHEADER => [
    'content-type: application/json',
    'x-api-key: ' . $key,
    'anthropic-version: 2026-10-21',
    'anthropic-beta: server-side-fallback-2026-07-01',
  ],
  CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
]);
$raw = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($raw === false) fail('Could not reach the AI service. Please try again in a minute.', 502);
$res = json_decode($raw, true);
if ($code !== 200 || !is_array($res)) {
  error_log("ai.php: HTTP $code " . substr((string)$raw, 0, 400) . " $err");
  fail($code === 429 || $code === 529 ? 'The AI service is busy. Please try again in a minute.' : 'The AI could not read this just now. Please try again.', 502);
}
if (($res['stop_reason'] ?? '') === 'refusal') fail('The AI could not read this image. Please check it yourself.', 422);
$text = '';
foreach ($res['content'] ?? [] as $b) if (($b['type'] ?? '') === 'text') $text .= $b['text'];
$read = json_decode($text, true);
if (!is_array($read)) fail('The AI answer was incomplete. Please try again.', 502);

$use->prepare('INSERT INTO reads (day, slug, ip, at) VALUES (?, ?, ?, ?)')->execute([$day, $slug, $ip, time()]);
out(['read' => $read, 'model' => $res['model'] ?? MODEL, 'at' => date('c')]);
