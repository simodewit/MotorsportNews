<?php
declare(strict_types=1);

$pageTitle = 'Calendar';
$activePage = 'calendar';
include __DIR__ . '/includes/layout-start.php';
?>
<section class="hero">
  <p class="eyebrow">Calendar</p>
  <h1>Map the season with a clean and consistent schedule view.</h1>
  <p class="intro">
    Ideal for upcoming race weekends, test sessions, release dates, or a compact month-by-month overview.
  </p>
</section>

<section class="content-grid">
  <article class="content-card">
    <h2>Next Event</h2>
    <p>Feature the nearest session or race here so visitors can orient themselves quickly.</p>
  </article>
  <article class="content-card">
    <h2>Season Overview</h2>
    <p>Use this panel for broader schedule context, including venue notes or key championship dates.</p>
  </article>
</section>
<?php include __DIR__ . '/includes/layout-end.php'; ?>
