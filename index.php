<?php
declare(strict_types=1);

$pageTitle = 'Home';
$activePage = 'home';
include __DIR__ . '/includes/layout-start.php';
?>
<section class="hero">
  <p class="eyebrow">Home</p>
  <h1>Welcome to a calmer motorsport news experience.</h1>
  <p class="intro">
    A focused front page for following headlines, schedules, and video coverage without unnecessary clutter.
  </p>
</section>

<section class="content-grid">
  <article class="content-card">
    <h2>Latest Focus</h2>
    <p>Use this area for the biggest story, featured race weekend, or a key editorial highlight.</p>
  </article>
  <article class="content-card">
    <h2>What to Watch</h2>
    <p>Surface upcoming broadcasts, recap clips, or fast links to the most useful content sections.</p>
  </article>
</section>
<?php include __DIR__ . '/includes/layout-end.php'; ?>
