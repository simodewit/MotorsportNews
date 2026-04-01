<?php
declare(strict_types=1);

$pageTitle = 'Broadcasts';
$activePage = 'broadcasts';
include __DIR__ . '/includes/layout-start.php';
?>
<section class="hero">
  <p class="eyebrow">Broadcasts</p>
  <h1>Track live coverage and replay windows in one place.</h1>
  <p class="intro">
    Highlight channels, race weekend start times, and where visitors can follow the next session.
  </p>
</section>

<section class="content-grid">
  <article class="content-card">
    <h2>Live Coverage</h2>
    <p>Reserve this area for the next live broadcast, including platform details and regional notes.</p>
  </article>
  <article class="content-card">
    <h2>Replays</h2>
    <p>Keep recent full-session replays or highlights easy to find with a compact and readable layout.</p>
  </article>
</section>
<?php include __DIR__ . '/includes/layout-end.php'; ?>
