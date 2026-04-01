<?php
declare(strict_types=1);

$pageTitle = 'Account';
$activePage = 'account';
include __DIR__ . '/includes/layout-start.php';
?>
<section class="hero">
  <p class="eyebrow">Account</p>
  <h1>Manage your profile, preferences, and saved motorsport content.</h1>
  <p class="intro">
    This page is linked directly from the round profile button in the shared header and keeps the same dark, minimal layout as the rest of the site.
  </p>
</section>

<section class="content-grid">
  <article class="content-card">
    <h2>Profile</h2>
    <p>Use this card for avatar details, account information, or an overview of a signed-in member profile.</p>
  </article>
  <article class="content-card">
    <h2>Preferences</h2>
    <p>Keep personalization settings, favorite series, and alert options organized in a clean secondary panel.</p>
  </article>
</section>
<?php include __DIR__ . '/includes/layout-end.php'; ?>
