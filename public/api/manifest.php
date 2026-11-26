<?php
// Install manifest for one clinic, so the app on the phone or computer carries the
// clinic's own name and opens straight into that clinic: api/manifest.php?t=<slug>&n=<name>
declare(strict_types=1);
header('Content-Type: application/manifest+json; charset=utf-8');
header('Cache-Control: public, max-age=3600');
$slug = strtolower((string)($_GET['t'] ?? ''));
if (!preg_match('/^[a-z0-9-]{1,40}$/', $slug)) $slug = '';
$name = trim(preg_replace('/[\x00-\x1F\x7F<>]/u', '', (string)($_GET['n'] ?? '')) ?? '');
if ($name === '' || mb_strlen($name) > 60) $name = 'Clinic & Hospital Management';
// The name under the icon on a phone fits about 12 letters: keep whole words.
$short = '';
foreach (preg_split('/\s+/u', $name) as $w) { if (mb_strlen(trim("$short $w")) > 12) break; $short = trim("$short $w"); }
if ($short === '') $short = mb_substr($name, 0, 12);
$start = $slug ? "/#/t/$slug" : '/';
echo json_encode([
  'name' => $name,
  'short_name' => $short,
  'id' => $slug ? "/?clinic=$slug" : '/',
  'start_url' => $start,
  'scope' => '/',
  'display' => 'standalone',
  'background_color' => '#f5f7fb',
  'theme_color' => '#0d1b33',
  'icons' => [
    ['src' => '/icons/icon-192.png', 'sizes' => '192x192', 'type' => 'image/png'],
    ['src' => '/icons/icon-512.png', 'sizes' => '512x512', 'type' => 'image/png'],
    ['src' => '/icons/maskable-512.png', 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
  ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
