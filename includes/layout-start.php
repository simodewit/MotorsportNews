<?php
declare(strict_types=1);

$pageTitle = $pageTitle ?? 'Home';
$activePage = $activePage ?? 'home';

$navigationItems = [
    ['key' => 'home', 'label' => 'Home', 'href' => 'index.php'],
    ['key' => 'broadcasts', 'label' => 'Broadcasts', 'href' => 'broadcasts.php'],
    ['key' => 'news', 'label' => 'News', 'href' => 'news.php'],
    ['key' => 'videos', 'label' => 'Videos', 'href' => 'videos.php'],
    ['key' => 'calendar', 'label' => 'Calendar', 'href' => 'calendar.php'],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MotorsportHub | <?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>
  <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
  <header class="site-header">
    <nav class="top-nav" aria-label="Main navigation">
      <a class="logo" href="index.php" aria-label="MotorsportHub home">
        <span class="logo-text">Motorsport</span><span class="logo-accent">Hub</span>
      </a>

      <ul class="nav-links">
        <?php foreach ($navigationItems as $item): ?>
          <?php $isActive = $activePage === $item['key']; ?>
          <li>
            <a
              class="<?= $isActive ? 'active' : '' ?>"
              href="<?= htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8') ?>"
              <?= $isActive ? 'aria-current="page"' : '' ?>
            >
              <?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?>
            </a>
          </li>
        <?php endforeach; ?>
      </ul>

      <div class="header-actions">
        <a
          class="profile-button <?= $activePage === 'account' ? 'active' : '' ?>"
          href="account.php"
          aria-label="Account"
          <?= $activePage === 'account' ? 'aria-current="page"' : '' ?>
        >
          <span aria-hidden="true">MH</span>
        </a>
      </div>
    </nav>
  </header>

  <main class="page-shell">
