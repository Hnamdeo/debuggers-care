<?php
// Live clinics served by the API. Each gets its own database file in data/.
// initial_password_hash: the staff password until an admin changes it in Settings
// (bcrypt via password_hash). Never put a plain password here.
return [
  'clinics' => [
    'vedantadental' => ['initial_password_hash' => '$2y$10$za59TJwgUlfhIABWLYHjYOEMQAJpi7GOX5y1P41ByalEeEwo0Dgu2'],
    'drmourya' => ['initial_password_hash' => '$2y$10$R.xE9uuatT3j5mIEaKJZq.LynkKqvLPGQJ9BdBmOWU2G/N/wus2Hq'],
  ],
];
