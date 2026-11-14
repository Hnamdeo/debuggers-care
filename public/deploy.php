<?php
// Receives a new build from GitHub Actions and puts it live.
// GitHub sends the built site as a zip with the secret key in the X-Deploy-Key header.
// The key lives in api/data/deploy.key (that folder is closed to the web).
// Clinic databases and uploaded pictures in api/data are never touched.
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

function stop(int $code, string $msg): never { http_response_code($code); echo $msg, "\n"; exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') stop(405, 'Use POST.');
$root = __DIR__;
$keyFile = $root . '/api/data/deploy.key';
$key = is_file($keyFile) ? trim((string)file_get_contents($keyFile)) : '';
if (strlen($key) < 24) stop(503, 'Deploy key not set up on the server.');
if (!hash_equals($key, (string)($_SERVER['HTTP_X_DEPLOY_KEY'] ?? ''))) { sleep(2); stop(403, 'Wrong key.'); }
if (!class_exists('ZipArchive')) stop(500, 'PHP zip extension missing.');

$body = file_get_contents('php://input');
if (!$body || strlen($body) < 1000) stop(400, 'No zip received.');

$work = $root . '/api/data/.incoming-' . bin2hex(random_bytes(6));
@mkdir($work, 0755, true);
$zipPath = $work . '.zip';
file_put_contents($zipPath, $body);
$zip = new ZipArchive();
if ($zip->open($zipPath) !== true) { @unlink($zipPath); stop(400, 'Not a zip file.'); }

// Only the app's own files may come in: no paths outside the folder, nothing in api/data.
for ($i = 0; $i < $zip->numFiles; $i++) {
  $n = $zip->getNameIndex($i);
  if (str_contains($n, '..') || str_starts_with($n, '/') || str_starts_with($n, 'api/data/')) {
    $zip->close(); @unlink($zipPath); stop(400, "Refused path in zip: $n");
  }
}
if ($zip->locateName('index.html') === false) { $zip->close(); @unlink($zipPath); stop(400, 'Zip has no index.html.'); }
$zip->extractTo($work);
$zip->close();
@unlink($zipPath);

function files(string $dir, string $base = ''): array {
  $out = [];
  foreach (scandir($dir) as $f) {
    if ($f === '.' || $f === '..') continue;
    $rel = $base === '' ? $f : "$base/$f";
    is_dir("$dir/$f") ? array_push($out, ...files("$dir/$f", $rel)) : $out[] = $rel;
  }
  return $out;
}
function rmtree(string $dir): void {
  foreach (scandir($dir) as $f) {
    if ($f === '.' || $f === '..') continue;
    is_dir("$dir/$f") ? rmtree("$dir/$f") : @unlink("$dir/$f");
  }
  @rmdir($dir);
}

// New scripts and styles first, the page that loads them last, so nobody gets a half-updated site.
$all = files($work);
usort($all, fn($a, $b) => ($a === 'index.html') <=> ($b === 'index.html'));
$done = 0;
foreach ($all as $rel) {
  $dest = "$root/$rel";
  @mkdir(dirname($dest), 0755, true);
  if (!@copy("$work/$rel", "$dest.tmp") || !@rename("$dest.tmp", $dest)) { rmtree($work); stop(500, "Could not write $rel"); }
  $done++;
}
rmtree($work);
echo "Deployed $done files at ", date('Y-m-d H:i:s'), "\n";
